"use server";

import { getFileDownloadURL } from "@/data/storage/files";
import { getCsvMetadata, getExcelMetadata } from "@/lib/helpers/parseFiles";

// Types
import { ExcelMetadata, CsvMetadata } from "@/types/file";

/**
 * Reads a file from Firebase Storage and extracts its metadata.
 * @param filePath - The path to the file in Firebase Storage.
 * @returns A promise that resolves to an object containing the file's metadata.
 */
export async function parseFile(
    filePath: string
): Promise<CsvMetadata | ExcelMetadata> {
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
            const metadata = getCsvMetadata(csvData);
            return metadata;
        } else if (fileExtension === "xlsx" || fileExtension === "xls") {
            const arrayBuffer = await response.arrayBuffer();
            const metadata = getExcelMetadata(arrayBuffer);
            return metadata;
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
