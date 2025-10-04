/**
 * @fileoverview API Route to process a file (extract headers and generate summary).
 */

import { NextResponse } from "next/server";
import { updateFileMetadata } from "@/data/files";
import { parseFile } from "@/lib/helpers/parseFile";
import { summarizeFileFlow } from "@/services/genkit/flows/summarizeFile";

/**
 * @function POST
 * @description Processes a file by extracting headers and generating an AI summary.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ fileId: string }> }
) {
    try {
        const { fileId } = await params;
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
            // Parse the file to extract column headers
            const columnHeaders = await parseFile(filePath);

            // Call the AI flow to generate a summary
            const { summary } = await summarizeFileFlow({
                fileName,
                columnHeaders,
            });

            // Update the file document in Firestore with the summary and headers
            await updateFileMetadata(fileId, {
                summary,
                headers: columnHeaders,
                status: "Ready",
            });

            return NextResponse.json({
                success: true,
                summary,
                headers: columnHeaders,
            });
        } catch (processingError) {
            console.error("Error processing file:", processingError);

            // Mark as Not ready if processing fails
            await updateFileMetadata(fileId, { status: "Not ready" });

            return NextResponse.json(
                { error: "Failed to process file." },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Error in process file API route:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
