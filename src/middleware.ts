import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // List of public paths that DON'T require authentication
    const publicPaths = [
      "/", // Root/landing page
      "/sign-in", // Sign in page
      "/sign-up", // Sign up page (if you have one)
    ];

    // Check if current path is public (allowed without auth)
    const isPublicPath = publicPaths.some(
      (path) => pathname === path || (path !== "/" && pathname.startsWith(path))
    );

    // If it's a public path, allow access without authentication
    if (isPublicPath) {
      return NextResponse.next();
    }

    // Get the session cookie
    const sessionCookie = request.cookies.get("session")?.value;

    if (!sessionCookie) {
      // No session cookie, redirect to sign-in
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // Let the request continue - actual verification will be done in server components/API routes
    return NextResponse.next();
  } catch (middlewareError) {
    console.error("Middleware: Fatal error:", middlewareError);
    // If middleware fails completely, allow request to continue to avoid breaking the app
    return NextResponse.next();
  }
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
