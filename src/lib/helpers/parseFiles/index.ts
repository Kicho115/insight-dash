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
        const numberOfRows = rows.length - 1;
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

function extractCleanedRows(worksheet: xlsx.WorkSheet): string[] {
    const range = worksheet["!ref"]
        ? xlsx.utils.decode_range(worksheet["!ref"])
        : null;

    if (!range) return [];

    let maxCol = 0;
    for (
        let row = range.s.r;
        row <= Math.min(range.s.r + MAX_ROWS_TO_CHECK - 1, range.e.r);
        row++
    ) {
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cell = worksheet[xlsx.utils.encode_cell({ r: row, c: col })];
            if (cell && cell.v !== undefined && cell.v !== null && cell.v !== "") {
                maxCol = Math.max(maxCol, col);
            }
        }
    }

    const actualRange = `A1:${xlsx.utils.encode_col(maxCol)}${MAX_ROWS_TO_CHECK}`;
    const jsonData = xlsx.utils.sheet_to_json(worksheet, {
        header: 1,
        range: actualRange,
        defval: "",
    }) as unknown[][];

    return jsonData
        .map((row) => cleanRow(row))
        .filter((row) => row !== "" && row !== "[]");
}

async function getSheetHeaders(worksheet: xlsx.WorkSheet): Promise<string[]> {
    const cleanedRows = extractCleanedRows(worksheet);
    if (cleanedRows.length === 0) return [];
    return getHeadersFlow(cleanedRows);
}

export async function getExcelMetadata(
    xlsxData: ArrayBuffer,
    selectedSheetName?: string
): Promise<ExcelMetadata> {
    try {
        const workbook = xlsx.read(xlsxData, {
            type: "array",
            cellDates: false,
            cellStyles: false,
        });

        // TODO: Verify that the file is correct before processing metadata
        const targetSheetName =
            selectedSheetName && workbook.SheetNames.includes(selectedSheetName)
                ? selectedSheetName
                : workbook.SheetNames[0];

        if (!targetSheetName) {
            throw new Error("No sheets found in workbook");
        }

        // Extract headers for ALL sheets in parallel
        const sheetsHeadersEntries = await Promise.all(
            workbook.SheetNames.map(async (name) => {
                const headers = await getSheetHeaders(workbook.Sheets[name]).catch(() => [] as string[]);
                return [name, headers] as [string, string[]];
            })
        );
        const sheetsHeaders: Record<string, string[]> = Object.fromEntries(sheetsHeadersEntries);

        const headers = sheetsHeaders[targetSheetName] ?? [];

        if (!headers || headers.length === 0) {
            throw new Error("Error generating headers from genkit flow");
        }

        const sheets: SheetInfo[] = workbook.SheetNames.map((sheetName) => {
            const ws = workbook.Sheets[sheetName];
            const ref = ws["!ref"];

            if (!ref) {
                return { name: sheetName, numberOfRows: 0, numberOfColumns: 0 };
            }

            const range = xlsx.utils.decode_range(ref);
            return {
                name: sheetName,
                numberOfRows: range.e.r - range.s.r,
                numberOfColumns: range.e.c - range.s.c + 1,
            };
        });

        return {
            summary: "",
            headers,
            sheets,
            selectedSheet: targetSheetName,
            sheetsHeaders,
        };
    } catch (error) {
        console.error("Error getting Excel metadata:", error);
        throw error;
    }
}
