import { NextResponse, NextRequest } from "next/server";
import { requireServerAuth } from "@/lib/serverAuth";
import { updateFileVisibility } from "@/data/files"; 

/**
 * @route PATCH /api/files/[fileId]/visibility
 * @description Updates the visibility setting of a file.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ fileId: string }> }
) {
    try {
        const user = await requireServerAuth();
        const { fileId } = await params;
        const { visibility } = await request.json(); // "private", "public", or a teamId

        if (!visibility) {
            return NextResponse.json(
                { error: "Visibility setting is required." },
                { status: 400 }
            );
        }

        // Call the Data Access Layer to securely perform the update
        await updateFileVisibility(fileId, user.uid, visibility);

        return NextResponse.json({
            success: true,
            message: "File visibility updated.",
        });
    } catch (error) {
        const message = (error as Error).message;
        console.error("Error updating visibility:", error);
        if (
            message.includes("permission") ||
            message.includes("not a member")
        ) {
            return NextResponse.json({ error: message }, { status: 403 });
        }
        if (message.includes("not found")) {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
