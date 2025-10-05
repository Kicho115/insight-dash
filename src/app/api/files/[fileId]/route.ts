import { NextResponse } from "next/server";
import { requireServerAuth } from "@/lib/serverAuth";
import { deleteFileById, getFileById } from "@/data/files";

/**
 * @route GET /api/files/[fileId]
 * @description Fetches the metadata for a single file.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ fileId: string }> }
) {
    try {
        const user = await requireServerAuth();
        const { fileId } = await params;

        // Call the data access layer to handle all logic
        const fileData = await getFileById(fileId, user.uid);

        return NextResponse.json(fileData);
    } catch (error) {
        // Centralized error handling
        const message = (error as Error).message;
        if (message === "Authentication required") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        if (message === "File not found.") {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        if (message.includes("permission")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

/**
 * @route DELETE /api/files/[fileId]
 * @description Securely deletes a file from Storage and its metadata from Firestore.
 */
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ fileId: string }> }
) {
    try {
        const user = await requireServerAuth();
        const { fileId } = await params;

        await deleteFileById(fileId, user.uid);

        return NextResponse.json({ success: true });
    } catch (error) {
        // Manejo de errores centralizado
        const message = (error as Error).message;
        if (message === "Authentication required") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        if (message === "File not found.") {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        if (message.includes("permission")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
