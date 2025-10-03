/**
 * @fileoverview API Route to handle secure file upload preparation.
 */

import { NextResponse } from "next/server";
import { requireServerAuth } from "@/lib/serverAuth";
import { prepareFileUpload } from "@/data/files"; // <-- Importamos la "receta"

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * @function POST
 * @description Handles a POST request to prepare a file upload.
 * It authenticates the user, creates a file metadata document in Firestore,
 * and returns a signed URL for the client to upload the file to.
 */
export async function POST(request: Request) {
    try {
        const user = await requireServerAuth();
        const body = await request.json();

        if (body.fileSize > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json(
                { error: `File size exceeds ${MAX_FILE_SIZE_MB}MB.` },
                { status: 413 }
            );
        }

        const result = await prepareFileUpload({ ...body, user });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error in prepare-upload API route:", error);
        if ((error as Error).message === "Authentication required") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
