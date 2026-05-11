export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { getFileById, updateFileMetadata } from "@/data/files";
import { getFileDownloadURL } from "@/data/storage/files";
import { handleApiError } from "@/lib/api/errorHandler";
import { requireServerAuth } from "@/lib/serverAuth";
import { getExcelMetadata } from "@/lib/helpers/parseFiles";
import { summarizeFileFlow } from "@/services/genkit/flows/summarizeFile";

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

        const sheetExists = file.metadata.sheets.some((s) => s.name === sheetName);
        if (!sheetExists) {
            return NextResponse.json(
                { error: `Sheet "${sheetName}" not found in this file.` },
                { status: 400 },
            );
        }

        // Already selected — no-op
        if (file.metadata.selectedSheet === sheetName) {
            return NextResponse.json({ success: true, alreadySelected: true });
        }

        const downloadUrl = await getFileDownloadURL(file.path);
        const fileResponse = await fetch(downloadUrl);
        if (!fileResponse.ok) {
            return NextResponse.json(
                { error: "Failed to download file from storage." },
                { status: 502 },
            );
        }
        const arrayBuffer = await fileResponse.arrayBuffer();

        const metadata = await getExcelMetadata(arrayBuffer, sheetName);

        if (!metadata.headers || metadata.headers.length === 0) {
            return NextResponse.json(
                { error: `No headers found in sheet "${sheetName}".` },
                { status: 422 },
            );
        }

        const { summary } = await summarizeFileFlow({
            fileName: file.displayName ?? file.name,
            columnHeaders: metadata.headers,
        });

        await updateFileMetadata(fileId, {
            metadata: { ...metadata, summary },
            status: "Ready",
        });

        return NextResponse.json({
            success: true,
            selectedSheet: sheetName,
            headers: metadata.headers,
            summary,
        });
    } catch (error) {
        console.error("[select-sheet/route] error:", error);
        return handleApiError(error);
    }
}
