export const runtime = "nodejs";

/**
 * @fileoverview API Route to process a file (extract headers and generate summary).
 */

import { NextResponse } from "next/server";
import { updateFileMetadata } from "@/data/files";
import { parseFile } from "@/lib/parseFile";
import { summarizeFileFlow } from "@/services/genkit/flows/summarizeFile";

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

        const body = await request.json();
        const { filePath, fileName } = body;

        if (!filePath || !fileName) {
            return NextResponse.json(
                { error: "Missing filePath or fileName." },
                { status: 400 }
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

            // Update the file document in Firestore with the summary and headers
            await updateFileMetadata(fileId, {
                metadata: {
                    ...metadata,
                    summary,
                },
                status: "Ready",
            });

            return NextResponse.json({
                success: true,
                summary,
                headers: columnHeaders,
            });
        } catch (processingError) {
            // If the error is due to missing headers, set status to Action Required
            if (processingError instanceof Error) {
                if (processingError.message === "No headers found.") {
                    await updateFileMetadata(fileId, {
                        status: "Action Required",
                    });
                }
            } else {
                console.error("Error processing file:", processingError);

                // Mark as Error if processing fails
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

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
