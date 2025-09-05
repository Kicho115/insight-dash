import { NextRequest, NextResponse } from "next/server";

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
    // Create response with CORS headers
    const response = NextResponse.json(
      { message: "Session cleared successfully" },
      { status: 200, headers: corsHeaders }
    );

    // Clear the session cookie by setting it to expire in the past
    response.cookies.set("session", "", {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("Error clearing session cookie:", error);
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
