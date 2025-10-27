/**
 * @fileoverview API Route to update file metadata (summary, headers, status).
 */

import { NextResponse } from "next/server";
import { updateFileMetadata } from "@/data/files";

/**
 * @function PATCH
 * @description Updates the metadata of a file (summary, headers, status).
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ fileId: string }> }
) {
    try {
        const { fileId } = await params;
        const body = await request.json();

        const { metadata, status } = body;

        await updateFileMetadata(fileId, { metadata, status });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating file metadata:", error);
        return NextResponse.json(
            { error: "Failed to update file metadata." },
            { status: 500 }
        );
    }
}
