import * as xlsx from "xlsx";

// Ai FLows
import { getHeadersFlow } from "@/services/genkit/flows/getHeaders";

// Types
import { ExcelMetadata, SheetInfo, CsvMetadata } from "@/types/file";

// We will check up to the first 10 rows of the file in case headers are not in the first row
const MAX_ROWS_TO_CHECK = 10;

export async function getCsvMetadata(csvData: string): Promise<CsvMetadata> {
    try {
        const rows = csvData.split("\n");
        const numberOfRows = rows.length;
        const headers = await getHeadersFlow(rows.slice(0, MAX_ROWS_TO_CHECK));

        return {
            summary: "",
            headers,
            numberOfRows,
        };
    } catch (error) {
        console.error("Error getting CSV headers:", error);
        throw error;
    }
}

/**
 * Cleans a row by removing trailing empty values and converting to string
 */
function cleanRow(row: unknown[]): string {
    // Find the last non-empty cell
    let lastNonEmptyIndex = -1;
    for (let i = row.length - 1; i >= 0; i--) {
        if (row[i] !== "" && row[i] !== null && row[i] !== undefined) {
            lastNonEmptyIndex = i;
            break;
        }
    }

    // If all cells are empty, return empty string
    if (lastNonEmptyIndex === -1) {
        return "";
    }

    // Slice to only include up to the last non-empty cell
    const cleanedRow = row.slice(0, lastNonEmptyIndex + 1);
    return JSON.stringify(cleanedRow);
}

export async function getExcelMetadata(
    xlsxData: ArrayBuffer
): Promise<ExcelMetadata> {
    try {
        const workbook = xlsx.read(xlsxData, {
            type: "array",
            cellDates: false,
            cellStyles: false,
        });

        // TODO: Verify that the file is correct before processing metadata
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
            throw new Error("No sheets found in workbook");
        }

        const worksheet = workbook.Sheets[firstSheetName];

        // Get the actual range of data (not including empty columns at the end)
        const range = worksheet["!ref"]
            ? xlsx.utils.decode_range(worksheet["!ref"])
            : null;

        if (!range) {
            throw new Error("Could not determine worksheet range");
        }

        // Find the actual last column with data by checking the first MAX_ROWS_TO_CHECK rows
        let maxCol = 0;
        for (
            let row = range.s.r;
            row <= Math.min(range.s.r + MAX_ROWS_TO_CHECK - 1, range.e.r);
            row++
        ) {
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
                const cell = worksheet[cellAddress];
                if (
                    cell &&
                    cell.v !== undefined &&
                    cell.v !== null &&
                    cell.v !== ""
                ) {
                    maxCol = Math.max(maxCol, col);
                }
            }
        }

        // Convert only the relevant range to JSON
        const actualRange = `A1:${xlsx.utils.encode_col(
            maxCol
        )}${MAX_ROWS_TO_CHECK}`;

        const jsonData = xlsx.utils.sheet_to_json(worksheet, {
            header: 1,
            range: actualRange,
            defval: "",
        }) as unknown[][];

        // Clean rows by removing trailing empty cells
        const cleanedRows = jsonData
            .map((row) => cleanRow(row))
            .filter((row) => row !== "" && row !== "[]"); // Remove completely empty rows

        if (cleanedRows.length === 0) {
            throw new Error("No data found in the Excel file");
        }

        const headers = await getHeadersFlow(cleanedRows);

        // If the headers is an empty array, the file is not in a valid format
        if (!headers) {
            throw new Error("Error generating headers from genkit flow");
        }

        const sheets: SheetInfo[] = workbook.SheetNames.map((sheetName) => {
            const ws = workbook.Sheets[sheetName];
            const ref = ws["!ref"];

            if (!ref) {
                return {
                    name: sheetName,
                    numberOfRows: 0,
                    numberOfColumns: 0,
                };
            }

            const range = xlsx.utils.decode_range(ref);
            return {
                name: sheetName,
                numberOfRows: range.e.r - range.s.r + 1,
                numberOfColumns: range.e.c - range.s.c + 1,
            };
        });

        return {
            summary: "",
            headers,
            sheets,
        };
    } catch (error) {
        console.error("Error getting Excel metadata:", error);
        throw error;
    }
}
