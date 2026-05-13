export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { getFileById, updateFileMetadata } from "@/data/files";
import { getFileDownloadURL } from "@/data/storage/files";
import { handleApiError } from "@/lib/api/errorHandler";
import { requireServerAuth } from "@/lib/serverAuth";
import { getExcelMetadata } from "@/lib/helpers/parseFiles";
import { summarizeFileFlow } from "@/services/genkit/flows/summarizeFile";
import type { ExcelMetadata } from "@/types/file";

const requestSchema = z.object({
    sheetName: z.string().min(1),
});

export async function POST(
    request: Request,
    { params }: { params: Promise<{ fileId: string }> },
) {
    try {
        const user = await requireServerAuth();
        const { fileId } = await params;

        const file = await getFileById(fileId, user.uid);

        if (!file.metadata || !("sheets" in file.metadata)) {
            return NextResponse.json(
                { error: "Sheet selection is only available for XLSX files." },
                { status: 400 },
            );
        }

        const { sheetName } = requestSchema.parse(await request.json());

        const excelMetadata = file.metadata as ExcelMetadata;

        const sheetExists = excelMetadata.sheets.some((s) => s.name === sheetName);
        if (!sheetExists) {
            return NextResponse.json(
                { error: `Sheet "${sheetName}" not found in this file.` },
                { status: 400 },
            );
        }

        // Already selected — no-op
        if (excelMetadata.selectedSheet === sheetName) {
            return NextResponse.json({ success: true, alreadySelected: true });
        }

        // Fast path: use pre-computed headers from initial processing
        const cachedHeaders = excelMetadata.sheetsHeaders?.[sheetName];

        let headers: string[];
        let sheetsHeaders = excelMetadata.sheetsHeaders;

        if (cachedHeaders && cachedHeaders.length > 0) {
            headers = cachedHeaders;
        } else {
            // Fallback: re-download and re-extract (older files without sheetsHeaders)
            const downloadUrl = await getFileDownloadURL(file.path);
            const fileResponse = await fetch(downloadUrl);
            if (!fileResponse.ok) {
                return NextResponse.json(
                    { error: "Failed to download file from storage." },
                    { status: 502 },
                );
            }
            const arrayBuffer = await fileResponse.arrayBuffer();
            const freshMetadata = await getExcelMetadata(arrayBuffer, sheetName);

            if (!freshMetadata.headers || freshMetadata.headers.length === 0) {
                return NextResponse.json(
                    { error: `No headers found in sheet "${sheetName}".` },
                    { status: 422 },
                );
            }

            headers = freshMetadata.headers;
            sheetsHeaders = freshMetadata.sheetsHeaders;
        }

        const { summary } = await summarizeFileFlow({
            fileName: file.displayName ?? file.name,
            columnHeaders: headers,
        });

        await updateFileMetadata(fileId, {
            metadata: {
                ...excelMetadata,
                headers,
                selectedSheet: sheetName,
                sheetsHeaders,
                summary,
            },
            status: "Ready",
        });

        return NextResponse.json({
            success: true,
            selectedSheet: sheetName,
            headers,
            summary,
        });
    } catch (error) {
        console.error("[select-sheet/route] error:", error);
        return handleApiError(error);
    }
}
