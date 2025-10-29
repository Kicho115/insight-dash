import "server-only";

import { dbAdmin } from "@/services/firebase/admin";
import { getStorage } from "firebase-admin/storage";
import { FieldValue } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import {
    File as FileMetadata,
    FileStatus,
    ExcelMetadata,
    CsvMetadata,
} from "@/types/file";

interface PrepareUploadOptions {
    fileName: string;
    fileType: string;
    fileSize: number;
    isPublic: boolean;
    displayName: string;
    user: { uid: string };
}

/**
 * Prepares a file upload by creating its metadata and generating a signed URL.
 * @param options - The file details and the authenticated user.
 * @returns The signed URL for uploading and the file's ID.
 */
export async function prepareFileUpload({
    fileName,
    fileType,
    fileSize,
    isPublic,
    displayName,
    user,
}: PrepareUploadOptions): Promise<{
    signedUrl: string;
    fileId: string;
    filePath: string;
}> {
    const fileId = uuidv4();
    const filePath = `files/${user.uid}/${fileId}/${fileName}`;
    const fileDocRef = dbAdmin.collection("files").doc(fileId);

    const finalMetadata = {
        id: fileId,
        name: fileName,
        displayName: displayName || fileName,
        size: fileSize,
        path: filePath,
        isPublic,
        creatorId: user.uid,
        permissions: [
            { type: "user" as const, id: user.uid, role: "admin" as const },
        ],
        isLocked: false,
        url: "",
        status: "Uploaded" as FileStatus,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    await fileDocRef.set(finalMetadata);

    const bucket = getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
    const file = bucket.file(filePath);
    const options = {
        version: "v4" as const,
        action: "write" as const,
        expires: Date.now() + 15 * 60 * 1000,
        contentType: fileType,
    };
    const [signedUrl] = await file.getSignedUrl(options);

    return { signedUrl, fileId, filePath };
}

/**
 * Fetches all files accessible to a user.
 * @param userId - The UID of the authenticated user.
 * @returns A list of the file metadata objects.
 */
export async function getFilesForUser(userId: string): Promise<FileMetadata[]> {
    const userFilesQuery = dbAdmin
        .collection("files")
        .where("creatorId", "==", userId);
    const publicFilesQuery = dbAdmin
        .collection("files")
        .where("isPublic", "==", true);

    const [userFilesSnapshot, publicFilesSnapshot] = await Promise.all([
        userFilesQuery.get(),
        publicFilesQuery.get(),
    ]);

    const filesMap = new Map<string, FileMetadata>();

    const processDoc = (doc: FirebaseFirestore.DocumentSnapshot) => {
        const data = doc.data();
        if (!data) return;

        filesMap.set(doc.id, {
            ...(data as Partial<FileMetadata>),
            id: doc.id,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as FileMetadata);
    };

    userFilesSnapshot.forEach(processDoc);
    publicFilesSnapshot.forEach(processDoc);

    const files = Array.from(filesMap.values());
    files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return files;
}

/**
 * Deletes a file from Storage and its metadata from Firestore.
 * @param fileId - The ID of the file to delete.
 * @param userId - The UID of the user requesting the deletion.
 */
export async function deleteFileById(
    fileId: string,
    userId: string
): Promise<void> {
    const fileDocRef = dbAdmin.collection("files").doc(fileId);
    const fileDoc = await fileDocRef.get();

    if (!fileDoc.exists) {
        throw new Error("File not found.");
    }

    const fileData = fileDoc.data();
    if (fileData?.creatorId !== userId) {
        throw new Error("User does not have permission to delete this file.");
    }

    if (fileData.path) {
        const bucket = getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
        await bucket.file(fileData.path).delete();
    }

    await fileDocRef.delete();
}

/**
 * Fetches a single file by its ID and verifies user's permission to access it.
 * @param fileId - The ID of the file to fetch.
 * @param userId - The UID of the user requesting the file.
 * @returns {Promise<FileMetadata>} The file metadata.
 * @throws Will throw an error if the file is not found or the user lacks permission.
 */
export async function getFileById(
    fileId: string,
    userId: string
): Promise<FileMetadata> {
    const fileDoc = await dbAdmin.collection("files").doc(fileId).get();
    if (!fileDoc.exists) {
        throw new Error("File not found.");
    }

    const fileData = fileDoc.data() as FileMetadata;

    // Security check: Allow access if the file is public or the user is the creator.
    const hasPermission = fileData.isPublic || fileData.creatorId === userId;

    if (!hasPermission) {
        throw new Error("User does not have permission to view this file.");
    }

    return fileData;
}

/**
 * Updates the summary and headers of a file after processing.
 * @param fileId - The ID of the file to update.
 * @param metadata - The metadata (summary, headers, sheets) extracted from the file.
 * @param status - The processing status of the file.
 */
export async function updateFileMetadata(
    fileId: string,
    {
        metadata,
        status,
    }: {
        metadata?: ExcelMetadata | CsvMetadata;
        status?: FileStatus;
    }
): Promise<void> {
    if (metadata === undefined && status === undefined) {
        throw new Error("No metadata or status provided for update.");
    }

    const fileDocRef = dbAdmin.collection("files").doc(fileId);

    const fileDoc = await fileDocRef.get();
    if (!fileDoc.exists) {
        throw new Error("File not found.");
    }

    // Build the update object
    const updateData: {
        metadata?: ExcelMetadata | CsvMetadata;
        status?: FileStatus;
        updatedAt: FirebaseFirestore.FieldValue;
    } = {
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (metadata !== undefined) {
        updateData.metadata = metadata;
    }

    if (status !== undefined) {
        updateData.status = status;
    }

    await fileDocRef.update(updateData);
}

/**
 * Updates the display name of a file.
 * Verifies that the user requesting the change is the creator.
 * @param fileId - The ID of the file to update.
 * @param userId - The UID of the user making the request.
 * @param newDisplayName - The new display name for the file.
 * @throws Will throw error if file not found or permission denied.
 */
export async function updateFileName(
    fileId: string,
    userId: string,
    newDisplayName: string
): Promise<void> {
    const fileDocRef = dbAdmin.collection("files").doc(fileId);
    const fileDoc = await fileDocRef.get();

    if (!fileDoc.exists) {
        throw new Error("File not found.");
    }

    const fileData = fileDoc.data();
    // Security Check: Only allow the creator to rename
    if (fileData?.creatorId !== userId) {
        throw new Error("User does not have permission to rename this file.");
    }

    // Update only the displayName and updatedAt timestamp
    await fileDocRef.update({
        displayName: newDisplayName,
        updatedAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Generates a secure, short-lived signed URL for downloading a file.
 * Verifies that the user requesting the download has permission.
 * @param fileId - The ID of the file to download.
 * @param userId - The UID of the user making the request.
 * @returns {Promise<string>} The signed download URL.
 * @throws Will throw error if file not found, path is missing, or permission denied.
 */
export async function getDownloadUrl(
    fileId: string,
    userId: string
): Promise<string> {
    const fileDocRef = dbAdmin.collection("files").doc(fileId);
    const fileDoc = await fileDocRef.get();

    if (!fileDoc.exists) {
        throw new Error("File not found.");
    }

    const fileData = fileDoc.data();
    if (!fileData || !fileData.path) {
        throw new Error("File path is missing in metadata.");
    }

    // Security Check: Allow download if public or user is creator
    // (Expand this later based on your 'permissions' array if needed)
    const hasPermission = fileData.isPublic || fileData.creatorId === userId;
    if (!hasPermission) {
        throw new Error("User does not have permission to download this file.");
    }

    // Generate signed URL (valid for 15 minutes by default)
    const bucket = getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
    const file = bucket.file(fileData.path);
    const [url] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes validity
    });

    return url;
}
