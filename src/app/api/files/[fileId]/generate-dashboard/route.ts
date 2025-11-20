import { NextResponse } from "next/server";
import { updateFileMetadata } from "@/data/files";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ fileId: string }> }
) {
    const paramsResolved = await params;
    const fileId = paramsResolved.fileId;

    // Update file status to Ready
    await updateFileMetadata(fileId, {
        status: "Ready",
    });

    return NextResponse.json({ success: true });
}
