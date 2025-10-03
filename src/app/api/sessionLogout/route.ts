import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authAdmin } from "@/services/firebase/admin";

/**
 * @route POST /api/sessionLogout
 * @description Clears the client-side session cookie and revokes the session on the Firebase server.
 */
export async function POST(_request: NextRequest) {
    try {
        const cookieStore = cookies();
        const sessionCookie = (await cookieStore).get("session")?.value;

        // 1. Clear the cookie on the client side immediately.
        // This provides a fast UX, logging the user out visually.
        (await cookieStore).set("session", "", {
            maxAge: 0,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            expires: new Date(0),
        });

        // 2. If a session cookie existed, revoke it on the Firebase server.
        // This is the crucial security step.
        if (sessionCookie) {
            try {
                const decodedToken = await authAdmin.verifySessionCookie(
                    sessionCookie,
                    true
                );
                await authAdmin.revokeRefreshTokens(decodedToken.uid);
            } catch (error) {
                // This can happen if the cookie is invalid or expired.
                // It's not a critical failure for the logout process, so we just log it.
                console.warn(
                    "Could not revoke session cookie on server:",
                    error
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: "Session cleared successfully.",
        });
    } catch (error) {
        console.error("Error in sessionLogout route:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
    // Your CORS headers can be simplified if they are the same everywhere,
    // but this is fine.
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin":
                process.env.NODE_ENV === "production"
                    ? "https://your-domain.com" // Remember to update this
                    : "http://localhost:3000",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}
