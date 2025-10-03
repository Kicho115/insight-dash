import { storageAdmin } from "@/services/firebase/admin";

/**
 * @function getFileDownloadURL
 * @param {string} filePath The path to the file in Firebase Storage
 * @returns {Promise<string>} The signed URL for the file
 * @description Generates a URL for a file stored in Firebase Storage.
 */
export const getFileDownloadURL = async (filePath: string): Promise<string> => {
    const bucket = storageAdmin.bucket();
    const file = bucket.file(filePath);
    const [url] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });
    return url;
};
