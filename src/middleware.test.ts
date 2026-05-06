/**
 * Test suite for authentication middleware.
 *
 * This test file covers the middleware that protects routes requiring authentication.
 * The middleware acts as a gatekeeper, checking for session cookies before allowing
 * access to protected routes. It distinguishes between public and protected paths
 * and redirects unauthenticated users appropriately.
 *
 * The middleware performs lightweight checks (cookie presence) while delegating
 * actual session verification to server components and API routes for better security
 * and separation of concerns.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { middleware } from "@/middleware";
import { NextRequest, NextResponse } from "next/server";

/**
 * Mock Next.js server response methods.
 * These methods are used by middleware to control routing behavior.
 */
vi.mock("next/server", async () => {
    const actual = await vi.importActual("next/server");
    return {
        ...actual,
        NextResponse: {
            next: vi.fn(() => ({
                headers: new Map(),
                status: 200,
            })),
            redirect: vi.fn((url: URL) => ({
                headers: new Map(),
                status: 307,
                url: url.toString(),
            })),
        },
    };
});

/**
 * Helper function to create a mock NextRequest with specific path and cookies.
 * This simulates incoming HTTP requests with various authentication states.
 *
 * @param pathname - The request path (e.g., "/home", "/sign-in")
 * @param sessionCookie - Optional session cookie value
 * @returns A mock NextRequest instance
 */
function createMockRequest(
    pathname: string,
    sessionCookie?: string
): NextRequest {
    const url = `http://localhost:3000${pathname}`;
    const mockCookies = new Map();

    if (sessionCookie) {
        mockCookies.set("session", { value: sessionCookie });
    }

    return {
        nextUrl: {
            pathname,
            href: url,
        },
        url,
        cookies: {
            get: (name: string) => mockCookies.get(name),
        },
    } as unknown as NextRequest;
}

/**
 * Test suite for authentication middleware functionality.
 *
 * The middleware implements a simple but effective protection strategy:
 * 1. Public paths (/, /sign-in, /sign-up) are always accessible
 * 2. Protected paths require a session cookie to proceed
 * 3. Missing session cookie triggers redirect to /sign-in
 * 4. Cookie presence allows request to continue (actual verification happens later)
 *
 * This approach balances security with performance - lightweight checks in middleware,
 * detailed verification in the actual route handlers.
 */
describe("Authentication Middleware", () => {
    /**
     * Clear all mock call histories before each test.
     * This ensures test isolation and prevents mock state pollution.
     */
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Clear mocks after each test as an additional safety measure
     * for complete test isolation.
     */
    afterEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Test: Root path is publicly accessible
     *
     * Scenario: User visits the landing/home page without authentication.
     * The root path "/" is configured as a public path.
     *
     * Expected behavior:
     * - Request is allowed to proceed without authentication
     * - NextResponse.next() is called to continue the request
     * - No redirect occurs
     * - Session cookie is not checked
     *
     * This ensures the landing page is accessible to everyone.
     */
    it("should allow access to root path without authentication", async () => {
        const mockRequest = createMockRequest("/");

        const response = await middleware(mockRequest);

        expect(NextResponse.next).toHaveBeenCalled();
        expect(NextResponse.redirect).not.toHaveBeenCalled();
        expect(response).toBeDefined();
    });

    /**
     * Test: Sign-in page is publicly accessible
     *
     * Scenario: User visits the sign-in page (/sign-in).
     * This page must be public or users can never log in.
     *
     * Expected behavior:
     * - Request is allowed to proceed
     * - NextResponse.next() is called
     * - No redirect occurs
     * - Works without session cookie
     *
     * This ensures users can access the login page.
     */
    it("should allow access to /sign-in without authentication", async () => {
        const mockRequest = createMockRequest("/sign-in");

        const response = await middleware(mockRequest);

        expect(NextResponse.next).toHaveBeenCalled();
        expect(NextResponse.redirect).not.toHaveBeenCalled();
        expect(response).toBeDefined();
    });

    /**
     * Test: Sign-up page is publicly accessible
     *
     * Scenario: User visits the sign-up page (/sign-up).
     * Registration page must be public for new users.
     *
     * Expected behavior:
     * - Request is allowed to proceed
     * - NextResponse.next() is called
     * - No redirect occurs
     * - Works without session cookie
     *
     * This ensures new users can register.
     */
    it("should allow access to /sign-up without authentication", async () => {
        const mockRequest = createMockRequest("/sign-up");

        const response = await middleware(mockRequest);

        expect(NextResponse.next).toHaveBeenCalled();
        expect(NextResponse.redirect).not.toHaveBeenCalled();
        expect(response).toBeDefined();
    });

    /**
     * Test: Protected route redirects when no session cookie exists
     *
     * Scenario: Unauthenticated user attempts to access a protected route.
     * No session cookie is present in the request.
     *
     * Expected behavior:
     * - Request is NOT allowed to proceed
     * - NextResponse.redirect() is called
     * - Redirect target is /sign-in
     * - NextResponse.next() is NOT called
     *
     * This is the core protection mechanism - unauthenticated users
     * are redirected to login before accessing protected content.
     */
    it("should redirect to /sign-in when accessing protected route without cookie", async () => {
        const mockRequest = createMockRequest("/home");

        const response = await middleware(mockRequest);

        expect(NextResponse.redirect).toHaveBeenCalledWith(
            new URL("/sign-in", mockRequest.url)
        );
        expect(NextResponse.next).not.toHaveBeenCalled();
        expect(response).toBeDefined();
    });

    /**
     * Test: Protected route allows access with session cookie
     *
     * Scenario: User with a session cookie attempts to access a protected route.
     * The middleware checks for cookie presence (not validity).
     *
     * Expected behavior:
     * - Request is allowed to proceed
     * - NextResponse.next() is called
     * - No redirect occurs
     * - Actual cookie verification happens in the route handler
     *
     * This demonstrates the two-stage authentication:
     * 1. Middleware checks cookie presence (fast)
     * 2. Route handler verifies cookie validity (secure)
     */
    it("should allow access to protected route when session cookie is present", async () => {
        const mockRequest = createMockRequest("/home", "valid-session-cookie");

        const response = await middleware(mockRequest);

        expect(NextResponse.next).toHaveBeenCalled();
        expect(NextResponse.redirect).not.toHaveBeenCalled();
        expect(response).toBeDefined();
    });

    /**
     * Test: Multiple protected routes without authentication
     *
     * Scenario: Test various protected paths to ensure consistent behavior.
     * None of these routes should be accessible without authentication.
     *
     * Expected behavior:
     * - All requests redirect to /sign-in
     * - No requests are allowed to proceed
     * - Behavior is consistent across different protected paths
     *
     * This validates that the middleware protects all non-public routes.
     */
    it("should redirect to /sign-in for various protected routes without cookie", async () => {
        const protectedPaths = ["/home", "/files", "/settings", "/team"];

        for (const path of protectedPaths) {
            vi.clearAllMocks();
            const mockRequest = createMockRequest(path);

            await middleware(mockRequest);

            expect(NextResponse.redirect).toHaveBeenCalledWith(
                new URL("/sign-in", mockRequest.url)
            );
            expect(NextResponse.next).not.toHaveBeenCalled();
        }
    });

    /**
     * Test: Multiple protected routes with authentication
     *
     * Scenario: Test various protected paths with a session cookie present.
     * All these routes should be accessible with authentication.
     *
     * Expected behavior:
     * - All requests are allowed to proceed
     * - NextResponse.next() is called for each
     * - No redirects occur
     * - Behavior is consistent across different protected paths
     *
     * This validates that authenticated users can access protected routes.
     */
    it("should allow access to various protected routes with session cookie", async () => {
        const protectedPaths = ["/home", "/files", "/settings", "/team"];

        for (const path of protectedPaths) {
            vi.clearAllMocks();
            const mockRequest = createMockRequest(path, "valid-session-cookie");

            await middleware(mockRequest);

            expect(NextResponse.next).toHaveBeenCalled();
            expect(NextResponse.redirect).not.toHaveBeenCalled();
        }
    });

    /**
     * Test: Nested public paths are accessible
     *
     * Scenario: Test paths that start with public path prefixes.
     * The middleware uses startsWith logic for non-root public paths.
     *
     * Expected behavior:
     * - Paths starting with /sign-in (e.g., /sign-in/callback) are accessible
     * - No authentication required
     * - No redirect occurs
     *
     * This ensures public path matching works for nested routes.
     */
    it("should allow access to nested public paths", async () => {
        const nestedPublicPaths = [
            "/sign-in/callback",
            "/sign-in/reset-password",
            "/sign-up/verify",
        ];

        for (const path of nestedPublicPaths) {
            vi.clearAllMocks();
            const mockRequest = createMockRequest(path);

            await middleware(mockRequest);

            expect(NextResponse.next).toHaveBeenCalled();
            expect(NextResponse.redirect).not.toHaveBeenCalled();
        }
    });

    /**
     * Test: Root path variations
     *
     * Scenario: Ensure root path matching is exact and doesn't affect other paths.
     * Only "/" should match as root, not "/something".
     *
     * Expected behavior:
     * - Exact "/" is public
     * - Paths like "/something" are protected
     * - Root matching doesn't use startsWith (special case in code)
     *
     * This validates precise root path matching logic.
     */
    it("should only allow exact root path, not paths starting with /", async () => {
        // Root should be allowed
        const rootRequest = createMockRequest("/");
        await middleware(rootRequest);
        expect(NextResponse.next).toHaveBeenCalled();

        vi.clearAllMocks();

        // Other paths starting with / should be protected
        const protectedRequest = createMockRequest("/something");
        await middleware(protectedRequest);
        expect(NextResponse.redirect).toHaveBeenCalled();
    });

    /**
     * Test: Middleware handles errors gracefully
     *
     * Scenario: An unexpected error occurs during middleware execution.
     * This could happen with malformed requests or runtime issues.
     *
     * Expected behavior:
     * - Middleware catches the error
     * - Error is logged to console
     * - Request is allowed to proceed (NextResponse.next())
     * - Application doesn't crash
     *
     * This fail-safe ensures the middleware doesn't break the entire application
     * if an unexpected error occurs. It's better to allow access than to break
     * the app completely.
     *
     * Note: This test creates an error by passing invalid data to the middleware.
     */
    it("should handle errors gracefully and allow request to continue", async () => {
        // Create a request that will cause an error when accessing properties
        const mockRequest = {
            nextUrl: null, // This will cause an error when trying to access pathname
            url: "http://localhost:3000/test",
            cookies: {
                get: () => undefined,
            },
        } as unknown as NextRequest;

        const response = await middleware(mockRequest);

        // Middleware should catch error and allow request to continue
        expect(response).toBeDefined();
        expect(NextResponse.next).toHaveBeenCalled();
    });

    /**
     * Test: Session cookie value doesn't matter in middleware
     *
     * Scenario: Middleware checks for cookie presence, not validity.
     * Any session cookie value (valid or invalid) allows access to protected routes.
     *
     * Expected behavior:
     * - Cookie presence alone grants access
     * - Cookie value is not validated in middleware
     * - NextResponse.next() is called
     * - Actual validation happens in route handlers
     *
     * This validates that middleware performs lightweight checks only,
     * leaving expensive validation operations to the route handlers.
     */
    it("should allow access with any session cookie value (validation happens later)", async () => {
        const invalidCookieValues = [
            "invalid-token",
            "expired-session",
            "tampered-cookie",
            "random-string",
        ];

        for (const cookieValue of invalidCookieValues) {
            vi.clearAllMocks();
            const mockRequest = createMockRequest("/home", cookieValue);

            await middleware(mockRequest);

            expect(NextResponse.next).toHaveBeenCalled();
            expect(NextResponse.redirect).not.toHaveBeenCalled();
        }
    });

    /**
     * Test: Case sensitivity of public paths
     *
     * Scenario: Verify that path matching is case-sensitive.
     * /sign-in should be public but /Sign-In should not.
     *
     * Expected behavior:
     * - Lowercase /sign-in is public
     * - Mixed case /Sign-In is protected (no match)
     * - Path matching is case-sensitive
     *
     * This ensures predictable path matching behavior.
     */
    it("should be case-sensitive for public paths", async () => {
        // Lowercase should work
        const lowercaseRequest = createMockRequest("/sign-in");
        await middleware(lowercaseRequest);
        expect(NextResponse.next).toHaveBeenCalled();

        vi.clearAllMocks();

        // Mixed case should not match public path
        const mixedCaseRequest = createMockRequest("/Sign-In");
        await middleware(mixedCaseRequest);
        expect(NextResponse.redirect).toHaveBeenCalled();
    });
});
