"use server";

import { getFileDownloadURL } from "@/data/storage/files";
import { getCsvHeaders, getXlsxHeaders } from "@/lib/helpers/parseFiles";

/**
 * Reads a file from Firebase Storage and extracts its column headers.
 * @param filePath - The path to the file in Firebase Storage.
 * @returns A promise that resolves to an array of column header strings.
 */
export async function parseFile(filePath: string): Promise<string[]> {
    try {
        const downloadUrl = await getFileDownloadURL(filePath);
        const fileExtension = filePath.split(".").pop()?.toLowerCase();

        // If the file is not XLSX or XLS, download only the first 1KB to read headers
        const response = await fetch(downloadUrl, {
            headers:
                fileExtension === "xlsx" || fileExtension === "xls"
                    ? {}
                    : { Range: "bytes=0-1023" },
        });

        if (!response.ok && response.status !== 206) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        if (fileExtension === "csv") {
            const csvData = await response.text();
            const headers = getCsvHeaders(csvData);
            return headers;
        } else if (fileExtension === "xlsx" || fileExtension === "xls") {
            const arrayBuffer = await response.arrayBuffer();
            const headers = getXlsxHeaders(arrayBuffer);
            return headers;
        } else {
            throw new Error(
                "Unsupported file type. Only CSV and XLSX are supported."
            );
        }
    } catch (error) {
        console.error(`Error reading file from Firebase Storage:`, error);
        throw error;
    }
}
