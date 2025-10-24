import "server-only";

import { dbAdmin } from "@/services/firebase/admin";
import { getStorage } from "firebase-admin/storage";
import { FieldValue } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import { File as FileMetadata, FileStatus } from "@/types/user";

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
 * @param summary - The generated summary of the file.
 * @param headers - The column headers extracted from the file.
 * @param status - The processing status of the file.
 */
export async function updateFileMetadata(
    fileId: string,
    {
        summary,
        headers,
        status,
    }: {
        summary?: string;
        headers?: string[];
        status?: FileStatus;
    }
): Promise<void> {
    const fileDocRef = dbAdmin.collection("files").doc(fileId);
    const fileDoc = await fileDocRef.get();

    if (!fileDoc.exists) {
        throw new Error("File not found.");
    }

    const updateData: {
        summary?: string;
        headers?: string[];
        status?: FileStatus;
        updatedAt: FirebaseFirestore.FieldValue;
    } = {
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (summary !== undefined) {
        updateData.summary = summary;
    }

    if (headers !== undefined) {
        updateData.headers = headers;
    }

    if (status !== undefined) {
        updateData.status = status;
    }

    await fileDocRef.update(updateData);
}
