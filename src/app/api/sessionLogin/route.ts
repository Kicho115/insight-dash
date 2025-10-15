import { NextRequest, NextResponse } from "next/server";
import { authAdmin } from "@/services/firebase/admin";
import { createOrUpdateUser } from "@/data/users";

export async function POST(request: NextRequest) {
    try {
        const { idToken } = await request.json();

        if (!idToken) {
            return NextResponse.json(
                { error: "ID token is required" },
                { status: 400 }
            );
        }

        // Verify the ID token to get user details
        const decodedToken = await authAdmin.verifyIdToken(idToken);

        const userRecord = await authAdmin.getUser(decodedToken.uid);

        // Create the user profile in Firestore from the server
        await createOrUpdateUser(userRecord.uid, {
            email: userRecord.email || "",
            name: userRecord.displayName || "",
        });

        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await authAdmin.createSessionCookie(idToken, {
            expiresIn,
        });

        const response = NextResponse.json({ success: true });
        response.cookies.set("session", sessionCookie, {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("Error creating session cookie:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin":
                process.env.NODE_ENV === "production"
                    ? "https://your-domain.com"
                    : "http://localhost:3000",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
            "Cross-Origin-Embedder-Policy": "unsafe-none",
        },
    });
}
