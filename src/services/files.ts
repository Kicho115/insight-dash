/**
 * @fileoverview Client-side service for file-related operations.
 */

import { File as FileMetadata } from "@/types/file";
import { AppUser } from "@/types/user";

interface UploadFileOptions {
    file: File;
    visibility: string;
    displayName: string;
    user: AppUser;
}

/**
 * @function uploadFile
 * @description Securely uploads a file by making a request to our backend API. Calls the AI flow to generate a summary and stores it in firebase.
 * @param {UploadFileOptions} options - The file details and the user.
 * @returns {Promise<{ success: boolean; error?: Error }>} The outcome of the upload.
 */
export const uploadFile = async ({
    file,
    visibility,
    displayName,
    user,
}: UploadFileOptions): Promise<{ success: boolean; error?: Error }> => {
    if (!user || !user.id) {
        return { success: false, error: new Error("User not authenticated.") };
    }

    let fileId: string | null = null;

    try {
        // Step 1: Call our backend API to get a signed URL (creates Pending doc)
        const response = await fetch("/api/files/upload", {
            method: "POST",
            body: JSON.stringify({
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                visibility: visibility,
                displayName: displayName,
            }),
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to prepare upload.");
        }

        const { signedUrl, filePath, fileId: returnedFileId } = await response.json();
        fileId = returnedFileId;

        // Step 2: PUT the file to Storage via the signed URL
        const uploadResponse = await fetch(signedUrl, {
            method: "PUT",
            body: file,
            headers: {
                "Content-Type": file.type,
            },
        });

        if (!uploadResponse.ok) {
            // Storage PUT failed — abandon the Pending Firestore doc
            if (fileId) {
                await fetch(`/api/files/${fileId}/abandon-upload`, {
                    method: "POST",
                }).catch((e) =>
                    console.error("Failed to abandon upload:", e)
                );
            }
            throw new Error("File upload to storage failed.");
        }

        // Step 3: Confirm the upload (server verifies file exists + size matches)
        const confirmResponse = await fetch(
            `/api/files/${fileId}/confirm-upload`,
            { method: "POST" }
        );

        if (!confirmResponse.ok) {
            const confirmError = await confirmResponse.json();
            throw new Error(
                confirmError.error || "Upload confirmation failed."
            );
        }

        const { filePath: confirmedPath } = await confirmResponse.json();

        // Step 4: Trigger processing (fire-and-forget)
        fetch(`/api/files/${fileId}/process`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                filePath: confirmedPath || filePath,
                fileName: displayName || file.name,
            }),
        }).catch((err) => {
            console.error(
                `Background processing trigger failed for ${fileId}:`,
                err
            );
        });

        return { success: true };
    } catch (error) {
        console.error("Error during file upload process:", error);
        return { success: false, error: error as Error };
    }
};

/**
 * @function getFilesForUser
 * @description Fetches the list of files accessible to the current user from the secure API route.
 * @returns {Promise<FileMetadata[]>} A promise that resolves to an array of file metadata.
 */
export const getFilesForUser = async (): Promise<FileMetadata[]> => {
    try {
        const response = await fetch("/api/files");

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to fetch files.");
        }

        const filesData: FileMetadata[] = await response.json();

        // Convert date strings from the API back into Date objects for easier use in the component
        return filesData.map((file) => ({
            ...file,
            createdAt: new Date(file.createdAt),
            updatedAt: new Date(file.updatedAt),
        }));
    } catch (error) {
        console.error("Error fetching files for user:", error);
        // Re-throw the error to be handled by the UI component
        throw error;
    }
};

/**
 * @function deleteFile
 * @description Calls the secure API route to delete a file.
 * @param {string} fileId The ID of the file to delete.
 * @returns {Promise<{ success: boolean; error?: Error }>} An object indicating the outcome.
 */
export const deleteFile = async (
    fileId: string
): Promise<{ success: boolean; error?: Error }> => {
    try {
        const response = await fetch(`/api/files/${fileId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to delete file.");
        }

        return { success: true };
    } catch (error) {
        console.error("Error deleting file:", error);
        return { success: false, error: error as Error };
    }
};

/**
 * @function renameFile
 * @description Calls the secure API route to rename a file.
 * @param fileId The ID of the file to rename.
 * @param newDisplayName The new display name.
 * @returns Promise indicating success or failure.
 */
export const renameFile = async (
    fileId: string,
    newDisplayName: string
): Promise<{ success: boolean; error?: Error }> => {
    try {
        const response = await fetch(`/api/files/${fileId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayName: newDisplayName }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to rename file.");
        }
        return { success: true };
    } catch (error) {
        console.error("Error renaming file:", error);
        return { success: false, error: error as Error };
    }
};

/**
 * @function getDownloadLink
 * @description Calls the secure API route to get a temporary download link.
 * @param fileId The ID of the file to download.
 * @returns Promise resolving to the download URL string, or null on error.
 */
export const getDownloadLink = async (
    fileId: string
): Promise<string | null> => {
    try {
        const response = await fetch(`/api/files/${fileId}/download`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to get download link.");
        }
        const { downloadUrl } = await response.json();
        return downloadUrl;
    } catch (error) {
        console.error("Error getting download link:", error);
        return null;
    }
};

/**
 * @function updateFileVisibility
 * @description Calls the secure API route to update a file's visibility.
 * @param fileId The ID of the file to update.
 * @param visibility The new visibility setting ("private", "public", or a teamId).
 * @returns {Promise<{ success: boolean; error?: Error }>}
 */
export const updateFileVisibility = async (
    fileId: string,
    visibility: string
): Promise<{ success: boolean; error?: Error }> => {
    try {
        const response = await fetch(`/api/files/${fileId}/visibility`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visibility }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to update visibility.");
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating file visibility:", error);
        return { success: false, error: error as Error };
    }
};
