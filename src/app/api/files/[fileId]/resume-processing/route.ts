import { NextResponse } from "next/server";
import { getFileById, updateFileMetadata } from "@/data/files";
import { handleApiError } from "@/lib/api/errorHandler";
import { requireServerAuth } from "@/lib/serverAuth";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ fileId: string }> },
) {
    try {
        const user = await requireServerAuth();
        const { fileId } = await params;

        // Access check: throws if user cannot access this file.
        await getFileById(fileId, user.uid);
        await updateFileMetadata(fileId, {
            status: "Ready",
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[resume-processing/route] error:", error);
        return handleApiError(error);
    }
}
