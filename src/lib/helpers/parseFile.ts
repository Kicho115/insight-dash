"use server";

import { getFileDownloadURL } from "@/data/storage/files";

/**
 * Reads the first line of a CSV file stored in Firebase Storage to extract column headers.
 * @param filePath - The path to the file in Firebase Storage.
 * @returns A promise that resolves to an array of column header strings.
 */
export async function parseFile(filePath: string): Promise<string[]> {
    try {
        const downloadUrl = await getFileDownloadURL(filePath);

        // Download the first 1KB of the file to read headers
        const response = await fetch(downloadUrl, {
            headers: {
                Range: "bytes=0-1023",
            },
        });

        if (!response.ok && response.status !== 206) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.text();

        const firstLine = data.split("\n")[0];
        const headers = firstLine.split(",");

        return headers;
    } catch (error) {
        console.error(
            `Error reading file from Firebase Storage "${filePath}":`,
            error
        );
        throw error;
    }
}
