import { NextResponse, NextRequest } from "next/server";
import { requireServerAuth } from "@/lib/serverAuth";
import { getDownloadUrl } from "@/data/files";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ fileId: string }> }
) {
    try {
        const user = await requireServerAuth();
        const { fileId } = await params;

        const downloadUrl = await getDownloadUrl(fileId, user.uid);

        return NextResponse.json({ downloadUrl });
    } catch (error) {
        // Re-use robust error handling
        const message = (error as Error).message;
        console.error("Error generating download URL:", error);
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
