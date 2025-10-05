import { NextResponse } from "next/server";
import { doesEmailExist } from "@/data/users";

/**
 * @route POST /api/users/check-email
 * @description Checks if a user with the given email exists in Firestore.
 * This is a secure way for the client to verify an email without direct DB access.
 */
export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email || typeof email !== "string") {
            return NextResponse.json(
                { error: "Email is required." },
                { status: 400 }
            );
        }

        // Use our new Data Access Layer function
        const exists = await doesEmailExist(email);

        return NextResponse.json({ exists });
    } catch (error) {
        console.error("Error in check-email route:", error);
        return NextResponse.json(
            { error: "An internal server error occurred." },
            { status: 500 }
        );
    }
}
