import "server-only";

import { dbAdmin } from "@/services/firebase/admin";
import { getStorage } from "firebase-admin/storage";
import { FieldValue } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import {
    File as FileMetadata,
    FileStatus,
    FilePermission,
    ExcelMetadata,
    CsvMetadata,
} from "@/types/file";
import { Team } from "@/types/user";
import { getTeamsForUser as fetchUserTeams, getTeamsForUser } from "./teams";

interface PrepareUploadOptions {
    fileName: string;
    fileType: string;
    fileSize: number;
    visibility: string;
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
    visibility,
    displayName,
    user,
}: PrepareUploadOptions): Promise<{
    signedUrl: string;
    fileId: string;
    filePath: string;
}> {
    // Determine visibility settings
    const isPublic = visibility === "public";
    const isPrivate = visibility === "private";
    // If it's not public or private, it must be a team ID
    const teamId = !isPublic && !isPrivate ? visibility : null;

    const permissions: { [key: string]: string } = {
        [user.uid]: "admin", // The creator is always admin
    };
    const teamIds: string[] = [];

    if (teamId) {
        // Verify the user is actually a member of this team before allowing
        const team = (
            await dbAdmin.collection("teams").doc(teamId).get()
        ).data() as Team;
        if (!team || !team.memberIds.includes(user.uid)) {
            throw new Error(
                "User does not have permission to share with this team."
            );
        }

        teamIds.push(teamId);
    }

    const fileId = uuidv4();
    const filePath = `files/${user.uid}/${fileId}/${fileName}`;
    const fileDocRef = dbAdmin.collection("files").doc(fileId);

    const finalMetadata = {
        id: fileId,
        name: fileName,
        displayName: displayName || fileName,
        size: fileSize,
        path: filePath,
        isPublic: isPublic,
        creatorId: user.uid,
        permissions: permissions,
        teamIds: teamIds,
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
    const userTeams = await fetchUserTeams(userId);
    const userTeamIds = userTeams.map((team) => team.id);

    // Define the 3 queries
    const userFilesQuery = dbAdmin
        .collection("files")
        .where("creatorId", "==", userId);
    const publicFilesQuery = dbAdmin
        .collection("files")
        .where("isPublic", "==", true);

    // Handle the 30 element limit in 'array-contains-any'
    const teamFilesQueries: FirebaseFirestore.Query[] = [];
    if (userTeamIds.length > 0) {
        const chunkSize = 30;
        for (let i = 0; i < userTeamIds.length; i += chunkSize) {
            const chunk = userTeamIds.slice(i, i + chunkSize);
            teamFilesQueries.push(
                dbAdmin
                    .collection("files")
                    .where("teamIds", "array-contains-any", chunk)
            );
        }
    }

    // Execute queries in parallel
    const promises = [
        userFilesQuery.get(),
        publicFilesQuery.get(),
        ...teamFilesQueries.map((q) => q.get()),
    ];

    const snapshots = await Promise.all(promises);
    const userFilesSnapshot = snapshots[0];
    const publicFilesSnapshot = snapshots[1];
    const teamFilesSnapshots = snapshots.slice(2);

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
    teamFilesSnapshots.forEach((snapshot) => {
        snapshot.forEach(processDoc);
    });

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

    let hasPermission = false;

    // 1. Is public
    if (fileData.isPublic) {
        hasPermission = true;
    }
    // 2. Creator
    else if (fileData.creatorId === userId) {
        hasPermission = true;
    }
    // 3. Its part of the teams the user belongs to
    else if (fileData.teamIds && fileData.teamIds.length > 0) {
        const userTeams = await getTeamsForUser(userId);
        const userTeamIds = userTeams.map((t) => t.id);
        hasPermission = fileData.teamIds.some((teamId: string) =>
            userTeamIds.includes(teamId)
        );
    }

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

/**
 * Updates the visibility of a file (isPublic, teamIds, permissions).
 * @param fileId - The ID of the file to update.
 * @param userId - The UID of the user making the request (must have admin permissions).
 * @param newVisibility - The new setting: "public", "private", or a teamId.
 * @throws Will throw error if file not found, permission denied, or invalid team.
 */
export async function updateFileVisibility(
    fileId: string,
    userId: string,
    newVisibility: string
): Promise<void> {
    const fileDocRef = dbAdmin.collection("files").doc(fileId);
    const fileDoc = await fileDocRef.get();

    if (!fileDoc.exists) {
        throw new Error("File not found.");
    }

    const fileData = fileDoc.data() as FileMetadata;

    // Security Check: Only allow creator/admin to change visibility
    const userRole = fileData.permissions[userId];
    if (fileData.creatorId !== userId && userRole !== "admin") {
        throw new Error(
            "You do not have permission to change this file's visibility."
        );
    }

    // Determine new visibility settings
    const isPublic = newVisibility === "public";
    const isPrivate = newVisibility === "private";
    const teamId = !isPublic && !isPrivate ? newVisibility : null;

    const newPermissions: FilePermission[] = [
        { type: "user", id: userId, role: "admin" }, // Keep the owner as admin
    ];
    const newTeamIds: string[] = [];

    if (teamId) {
        // Verify the user is a member of the team they are sharing to
        const team = (
            await dbAdmin.collection("teams").doc(teamId).get()
        ).data() as Team;
        if (!team || !team.memberIds.includes(userId)) {
            throw new Error(
                "You cannot share a file with a team you are not a member of."
            );
        }
        // Add the new team permission
        newPermissions.push({ type: "team", id: teamId, role: "view" });
        newTeamIds.push(teamId);
    }

    // Atomically update the document in Firestore
    await fileDocRef.update({
        isPublic: isPublic,
        permissions: newPermissions,
        teamIds: newTeamIds,
        updatedAt: FieldValue.serverTimestamp(),
    });
}
