import * as xlsx from "xlsx";

export function getCsvHeaders(csvData: string): string[] {
    const firstLine = csvData.split("\n")[0];
    const headers = firstLine.split(",");
    return headers;
}

export function getXlsxHeaders(xlsxData: ArrayBuffer): string[] {
    const workbook = xlsx.read(xlsxData, {
        type: "array",
        sheetRows: 1, // Read only the first row to get headers
    });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = jsonData[0] as string[];
    return headers;
}
