import * as xlsx from "xlsx";

import { getHeadersFlow } from "@/services/genkit/flows/getHeaders";

// We will check up to the first 10 rows of the file in case headers are not in the first row
const MAX_ROWS_TO_CHECK = 10;

export async function getCsvHeaders(csvData: string): Promise<string[]> {
    try {
        const rows = csvData.split("\n").slice(0, MAX_ROWS_TO_CHECK);
        const headers = await getHeadersFlow(rows);

        return headers;
    } catch (error) {
        console.error("Error getting CSV headers:", error);
        throw error;
    }
}

export async function getXlsxHeaders(xlsxData: ArrayBuffer): Promise<string[]> {
    try {
        const workbook = xlsx.read(xlsxData, {
            type: "array",
            sheetRows: MAX_ROWS_TO_CHECK,
        });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        const rows = jsonData.map((row) => JSON.stringify(row as unknown[]));
        const headers = await getHeadersFlow(rows);

        return headers;
    } catch (error) {
        console.error("Error getting XLSX headers:", error);
        throw error;
    }
}
