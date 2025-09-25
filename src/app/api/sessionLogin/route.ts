import { NextRequest, NextResponse } from "next/server";
import { authAdmin } from "@/services/firebase/admin";

export async function POST(request: NextRequest) {
    // Add CORS headers for better compatibility
    const corsHeaders = {
        "Access-Control-Allow-Origin":
            process.env.NODE_ENV === "production"
                ? "https://your-domain.com"
                : "http://localhost:3000",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
        "Cross-Origin-Embedder-Policy": "unsafe-none",
    };

    try {
        const { idToken } = await request.json();

        if (!idToken) {
            return NextResponse.json(
                { error: "ID token is required" },
                { status: 400 }
            );
        }

        // Verify the ID token
        const decodedToken = await authAdmin.verifyIdToken(idToken);

        // Create session cookie (expires in 5 days)
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await authAdmin.createSessionCookie(idToken, {
            expiresIn,
        });

        // Create response with CORS headers
        const response = NextResponse.json(
            { message: "Session created successfully" },
            { status: 200, headers: corsHeaders }
        );

        // Set secure cookie
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
            { status: 500, headers: corsHeaders }
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
