/**
 * @fileoverview Client-side service for file-related operations.
 */

import { AppUser } from "@/types/user";

interface UploadFileOptions {
  file: File;
  isPublic: boolean;
  displayName: string;
  user: AppUser;
}

/**
 * @function uploadFile
 * @description Securely uploads a file by making a request to our backend API.
 * @param {UploadFileOptions} options - The file details and the user.
 * @returns {Promise<{ success: boolean; error?: Error }>} The outcome of the upload.
 */
export const uploadFile = async ({
  file,
  isPublic,
  displayName,
  user,
}: UploadFileOptions): Promise<{ success: boolean; error?: Error }> => {
  if (!user || !user.id) {
    return { success: false, error: new Error("User not authenticated.") };
  }

  try {
    // Step 1: Call our own backend API to get a signed URL
    const response = await fetch("/api/files/upload", {
      method: "POST",
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        isPublic,
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

    const { signedUrl } = await response.json();

    // Step 2: Use the signed URL to upload the file directly to Google Cloud Storage
    const uploadResponse = await fetch(signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error("File upload to storage failed.");
    }

    return { success: true };
  } catch (error) {
    console.error("Error during file upload process:", error);
    return { success: false, error: error as Error };
  }
};
