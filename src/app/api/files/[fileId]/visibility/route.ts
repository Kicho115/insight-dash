import { NextResponse, NextRequest } from "next/server";
import { requireServerAuth } from "@/lib/serverAuth";
import { updateFileVisibility } from "@/data/files"; 
import { parseJson } from "@/lib/api/validation";
import { fileVisibilitySchema } from "@/lib/api/schemas";
import { handleApiError } from "@/lib/api/errorHandler";

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
        const { visibility } = await parseJson(
            request,
            fileVisibilitySchema
        ); // "private", "public", or a teamId

        // Call the Data Access Layer to securely perform the update
        await updateFileVisibility(fileId, user.uid, visibility);

        return NextResponse.json({
            success: true,
            message: "File visibility updated.",
        });
    } catch (error) {
        console.error("Error updating visibility:", error);
        return handleApiError(error);
    }
}
