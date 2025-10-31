import { NextResponse } from "next/server";
import { requireServerAuth } from "@/lib/serverAuth";
import { updateUserName } from "@/data/users";

/**
 * @route PATCH /api/users/profile
 * @description Updates the authenticated user's profile (e.g., their name).
 */
export async function PATCH(request: Request) {
    try {
        const user = await requireServerAuth(); // 1. Authenticate
        const { name } = await request.json(); // 2. Get new data

        if (!name) {
            return NextResponse.json(
                { error: "Name is required." },
                { status: 400 }
            );
        }

        // 3. Call the Data Access Layer
        await updateUserName(user.uid, name);

        return NextResponse.json({
            success: true,
            message: "Profile updated successfully.",
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        const message = (error as Error).message;
        if (message === "Authentication required") {
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
