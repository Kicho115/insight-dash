/**
 * @fileoverview API Route to abandon a pending file upload.
 * Called by the client when the Storage PUT fails, to clean up
 * the orphaned Firestore metadata document.
 */

import { NextResponse } from "next/server";
import { requireServerAuth } from "@/lib/serverAuth";
import { abandonFileUpload } from "@/data/files";
import { handleApiError } from "@/lib/api/errorHandler";

/**
 * @function POST
 * @description Abandons a pending file upload by deleting the Firestore
 * metadata document and any partial Storage data.
 */
export async function POST(
    _request: Request,
    { params }: { params: Promise<{ fileId: string }> }
) {
    try {
        const user = await requireServerAuth();
        const { fileId } = await params;

        await abandonFileUpload(fileId, user.uid);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in abandon-upload API route:", error);
        return handleApiError(error);
    }
}
