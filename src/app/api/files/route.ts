import { NextResponse } from "next/server";
import { requireServerAuth } from "@/lib/serverAuth";
import { getFilesForUser } from "@/data/files";

/**
 * @route GET /api/files
 * @description Fetches all files accessible to the authenticated user (their own and public files).
 */
export async function GET() {
    try {
        const user = await requireServerAuth();
        const files = await getFilesForUser(user.uid);

        // Convert Date objects to ISO strings for serialization
        const serializableFiles = files.map((file) => ({
            ...file,
            createdAt: file.createdAt.toISOString(),
            updatedAt: file.updatedAt.toISOString(),
        }));

        return NextResponse.json(serializableFiles);
    } catch (error) {
        console.error("Error fetching files:", error);
        if ((error as Error).message === "Authentication required") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
