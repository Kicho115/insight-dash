export const runtime = "nodejs";

/**
 * @fileoverview API Route to process a file (extract headers and generate summary).
 */

import { NextResponse } from "next/server";
import { dbAdmin } from "@/services/firebase/admin";
import { updateFileMetadata } from "@/data/files";
import { parseFile } from "@/lib/parseFile";
import { summarizeFileFlow } from "@/services/genkit/flows/summarizeFile";
import { parseJson } from "@/lib/api/validation";
import { fileProcessSchema } from "@/lib/api/schemas";
import { handleApiError } from "@/lib/api/errorHandler";
import type { ExcelMetadata } from "@/types/file";

/**
 * @function POST
 * @description Processes a file by extracting headers and generating an AI summary.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ fileId: string }> }
) {
    let fileId = "";
    try {
        const paramsResolved = await params;
        fileId = paramsResolved.fileId;

        const { filePath, fileName } = await parseJson(
            request,
            fileProcessSchema
        );

        // Guard: only allow processing of confirmed ("Uploaded") files
        const fileDoc = await dbAdmin.collection("files").doc(fileId).get();
        if (!fileDoc.exists) {
            return NextResponse.json(
                { error: "File not found." },
                { status: 404 }
            );
        }
        const currentStatus = fileDoc.data()?.status;
        if (currentStatus !== "Uploaded") {
            return NextResponse.json(
                {
                    error: `Cannot process file with status "${currentStatus}". File must be in "Uploaded" status.`,
                },
                { status: 409 }
            );
        }

        // Set status to Processing
        await updateFileMetadata(fileId, { status: "Processing" });

        try {
            // Parse the file to extract metadata
            const metadata = await parseFile(filePath);
            const columnHeaders = metadata.headers;

            // Call the AI flow to generate a summary
            const { summary } = await summarizeFileFlow({
                fileName,
                columnHeaders,
            });

            // Seed sheetsSummaries for xlsx so the first sheet switch is instant
            const isExcel = "selectedSheet" in metadata;
            const sheetsSummaries = isExcel
                ? { [(metadata as ExcelMetadata).selectedSheet ?? (metadata as ExcelMetadata).sheets[0]?.name ?? ""]: summary }
                : undefined;

            await updateFileMetadata(fileId, {
                metadata: {
                    ...metadata,
                    summary,
                    ...(sheetsSummaries ? { sheetsSummaries } : {}),
                },
                status: "Ready",
            });

            return NextResponse.json({
                success: true,
                summary,
                headers: columnHeaders,
            });
        } catch (processingError) {
            console.error("Error processing file:", processingError);
            if (
                processingError instanceof Error &&
                processingError.message === "No headers found."
            ) {
                await updateFileMetadata(fileId, { status: "Action Required" });
            } else {
                await updateFileMetadata(fileId, { status: "Error" });
            }

            return NextResponse.json(
                { error: "The file is not in a valid format." },
                { status: 422 }
            );
        }
    } catch (error) {
        console.error("Error in process file API route:", error);

        if (fileId) {
            try {
                await updateFileMetadata(fileId, { status: "Error" });
            } catch (updateErr) {
                console.error("Failed to set error status:", updateErr);
            }
        }

        return handleApiError(error);
    }
}
