/**
 * @fileoverview API Route to confirm a file upload after the client
 * has successfully PUT the file to Storage via the signed URL.
 */

import { NextResponse } from "next/server";
import { requireServerAuth } from "@/lib/serverAuth";
import { confirmFileUpload } from "@/data/files";
import { handleApiError } from "@/lib/api/errorHandler";

/**
 * @function POST
 * @description Confirms that a file has been successfully uploaded to Storage.
 * Verifies the file exists and its size matches, then transitions
 * status from "Pending" to "Uploaded".
 */
export async function POST(
    _request: Request,
    { params }: { params: Promise<{ fileId: string }> }
) {
    try {
        const user = await requireServerAuth();
        const { fileId } = await params;

        const result = await confirmFileUpload(fileId, user.uid);

        return NextResponse.json({
            confirmed: result.confirmed,
            fileId: result.fileId,
            filePath: result.filePath,
        });
    } catch (error) {
        console.error("Error in confirm-upload API route:", error);
        return handleApiError(error);
    }
}
