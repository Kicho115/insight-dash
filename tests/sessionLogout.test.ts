/**
 * Test suite for POST /api/sessionLogout route.
 *
 * This test file covers the session logout endpoint that invalidates user
 * sessions both client-side (by clearing cookies) and server-side (by
 * revoking refresh tokens in Firebase). The route ensures users are properly
 * logged out from both client and server perspectives.
 *
 * All external dependencies (Next.js cookies, Firebase Admin) are mocked
 * to allow isolated unit testing without side effects.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/sessionLogout/route";
import { NextRequest } from "next/server";

/**
 * Mock Next.js cookies function.
 * This allows us to simulate cookie operations without relying on the
 * actual Next.js runtime environment.
 */
vi.mock("next/headers", () => ({
    cookies: vi.fn(),
}));

/**
 * Mock Firebase Admin SDK.
 * We mock the authentication methods needed for session verification
 * and token revocation.
 */
vi.mock("@/services/firebase/admin", () => ({
    authAdmin: {
        verifySessionCookie: vi.fn(),
        revokeRefreshTokens: vi.fn(),
    },
}));

import { cookies } from "next/headers";
import { authAdmin } from "@/services/firebase/admin";

/**
 * Helper function to create a mock NextRequest.
 * The logout endpoint doesn't use the request body, so we keep it simple.
 *
 * @returns A mock NextRequest instance
 */
function createMockRequest(): NextRequest {
    return {} as NextRequest;
}

/**
 * Test suite for the POST /api/sessionLogout endpoint.
 *
 * This endpoint handles user logout by:
 * 1. Immediately clearing the session cookie on the client side (maxAge: 0, expires: past date)
 * 2. Attempting to verify and revoke the session on Firebase server if cookie exists
 * 3. Returning success response regardless of revocation outcome (graceful degradation)
 *
 * The endpoint prioritizes user experience - client-side logout is immediate
 * even if server-side revocation fails.
 */
describe("POST /api/sessionLogout", () => {
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
     * Test: Successful logout with valid session cookie
     *
     * Scenario: User has a valid session cookie and requests logout.
     * The cookie is verified with Firebase, tokens are revoked, and the
     * cookie is cleared.
     *
     * Expected behavior:
     * - Response status is 200 OK
     * - Response body contains { success: true, message: "Session cleared successfully." }
     * - Set-Cookie header is present to clear the session cookie
     * - Cookie has maxAge: 0 (expires immediately)
     * - Cookie has expires set to past date (new Date(0))
     * - Cookie maintains security flags (httpOnly, secure, sameSite, path)
     * - Firebase revokeRefreshTokens is called with correct uid
     *
     * This verifies the complete logout flow for authenticated users.
     */
    it("should return 200 and invalidate cookie when logout is successful", async () => {
        const mockDecodedToken = {
            uid: "user123",
            email: "user@example.com",
        };

        const mockCookieStore = {
            get: vi.fn().mockReturnValue({ value: "valid-session-cookie" }),
            set: vi.fn(),
        };

        (cookies as any).mockResolvedValue(mockCookieStore);
        (authAdmin.verifySessionCookie as any).mockResolvedValue(
            mockDecodedToken
        );
        (authAdmin.revokeRefreshTokens as any).mockResolvedValue(undefined);

        const mockRequest = createMockRequest();
        const response = await POST(mockRequest);
        const json = await response.json();

        // Verify response status and body
        expect(response.status).toBe(200);
        expect(json).toEqual({
            success: true,
            message: "Session cleared successfully.",
        });

        // Verify the cookie was cleared with correct parameters
        expect(mockCookieStore.set).toHaveBeenCalledWith("session", "", {
            maxAge: 0,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            expires: new Date(0),
        });

        // Verify Firebase token revocation was called
        expect(authAdmin.verifySessionCookie).toHaveBeenCalledWith(
            "valid-session-cookie",
            true
        );
        expect(authAdmin.revokeRefreshTokens).toHaveBeenCalledWith("user123");
    });

    /**
     * Test: Logout without session cookie
     *
     * Scenario: User requests logout but has no session cookie.
     * This can happen if:
     * - User never logged in
     * - Cookie already expired
     * - Cookie was manually deleted
     *
     * Expected behavior:
     * - Response status is 200 OK
     * - Response body contains success message
     * - Cookie is still cleared (set to empty with maxAge: 0)
     * - Firebase revocation is NOT attempted (no cookie to verify)
     * - No errors are thrown
     *
     * This ensures logout works gracefully even without an active session.
     */
    it("should return 200 even when no session cookie exists", async () => {
        const mockCookieStore = {
            get: vi.fn().mockReturnValue(undefined),
            set: vi.fn(),
        };

        (cookies as any).mockResolvedValue(mockCookieStore);

        const mockRequest = createMockRequest();
        const response = await POST(mockRequest);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json).toEqual({
            success: true,
            message: "Session cleared successfully.",
        });

        // Cookie should still be cleared
        expect(mockCookieStore.set).toHaveBeenCalledWith("session", "", {
            maxAge: 0,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            expires: new Date(0),
        });

        // Firebase revocation should NOT be attempted
        expect(authAdmin.verifySessionCookie).not.toHaveBeenCalled();
        expect(authAdmin.revokeRefreshTokens).not.toHaveBeenCalled();
    });

    /**
     * Test: Logout succeeds even when session verification fails
     *
     * Scenario: User has a session cookie but it's invalid or expired.
     * Firebase Admin SDK rejects verification.
     *
     * Expected behavior:
     * - Response status is 200 OK (logout still succeeds)
     * - Response body contains success message
     * - Cookie is cleared client-side
     * - Error is logged as warning (not thrown)
     * - Token revocation is NOT attempted (verification failed)
     *
     * This demonstrates graceful degradation - client-side logout works
     * even if server-side session validation fails.
     */
    it("should return 200 even when session verification fails", async () => {
        const mockCookieStore = {
            get: vi.fn().mockReturnValue({ value: "invalid-session-cookie" }),
            set: vi.fn(),
        };

        (cookies as any).mockResolvedValue(mockCookieStore);
        (authAdmin.verifySessionCookie as any).mockRejectedValue(
            new Error("Invalid session cookie")
        );

        const mockRequest = createMockRequest();
        const response = await POST(mockRequest);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json).toEqual({
            success: true,
            message: "Session cleared successfully.",
        });

        // Cookie should still be cleared
        expect(mockCookieStore.set).toHaveBeenCalled();

        // Verification was attempted but revocation was not
        expect(authAdmin.verifySessionCookie).toHaveBeenCalled();
        expect(authAdmin.revokeRefreshTokens).not.toHaveBeenCalled();
    });

    /**
     * Test: Logout succeeds even when token revocation fails
     *
     * Scenario: Session cookie is valid and verified, but Firebase Admin
     * fails to revoke the refresh tokens. This could indicate:
     * - Firebase Auth service issues
     * - Network connectivity problems
     * - User's tokens were already revoked
     *
     * Expected behavior:
     * - Response status is 200 OK (logout still succeeds)
     * - Response body contains success message
     * - Cookie is cleared client-side
     * - Error is logged as warning (not thrown)
     *
     * This ensures user experience isn't degraded by server-side failures.
     * User is logged out from the client perspective, which is the primary goal.
     */
    it("should return 200 even when revokeRefreshTokens fails", async () => {
        const mockDecodedToken = {
            uid: "user456",
            email: "user@example.com",
        };

        const mockCookieStore = {
            get: vi.fn().mockReturnValue({ value: "valid-session-cookie" }),
            set: vi.fn(),
        };

        (cookies as any).mockResolvedValue(mockCookieStore);
        (authAdmin.verifySessionCookie as any).mockResolvedValue(
            mockDecodedToken
        );
        (authAdmin.revokeRefreshTokens as any).mockRejectedValue(
            new Error("Failed to revoke tokens")
        );

        const mockRequest = createMockRequest();
        const response = await POST(mockRequest);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json).toEqual({
            success: true,
            message: "Session cleared successfully.",
        });

        // Cookie should still be cleared
        expect(mockCookieStore.set).toHaveBeenCalled();

        // Both verification and revocation were attempted
        expect(authAdmin.verifySessionCookie).toHaveBeenCalled();
        expect(authAdmin.revokeRefreshTokens).toHaveBeenCalledWith("user456");
    });

    /**
     * Test: Cookie is set with correct security parameters
     *
     * Scenario: Verify that the cleared cookie maintains all necessary
     * security flags to properly invalidate the session.
     *
     * Expected behavior:
     * - Cookie name is "session"
     * - Cookie value is empty string ""
     * - maxAge is 0 (expire immediately)
     * - expires is set to Unix epoch (new Date(0), Jan 1 1970)
     * - httpOnly is true (JavaScript cannot access)
     * - secure matches NODE_ENV (true in production, false in dev)
     * - sameSite is "strict" (CSRF protection)
     * - path is "/" (affects entire site)
     *
     * This validates that cookie clearing follows security best practices.
     */
    it("should clear cookie with maxAge 0 and expiration in the past", async () => {
        const mockCookieStore = {
            get: vi.fn().mockReturnValue(undefined),
            set: vi.fn(),
        };

        (cookies as any).mockResolvedValue(mockCookieStore);

        const mockRequest = createMockRequest();
        await POST(mockRequest);

        // Verify exact cookie clearing parameters
        expect(mockCookieStore.set).toHaveBeenCalledWith("session", "", {
            maxAge: 0,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            expires: new Date(0),
        });

        // Verify maxAge is exactly 0
        const callArgs = mockCookieStore.set.mock.calls[0];
        expect(callArgs[2].maxAge).toBe(0);

        // Verify expires is a date in the past (Unix epoch)
        expect(callArgs[2].expires.getTime()).toBe(0);
    });

    /**
     * Test: Response body structure is correct
     *
     * Scenario: Verify that the response body always contains the expected
     * structure and message regardless of the session state.
     *
     * Expected behavior:
     * - Response is valid JSON
     * - Contains "success" boolean field set to true
     * - Contains "message" string field with specific text
     * - No additional unexpected fields
     *
     * This validates the API contract for the logout endpoint.
     */
    it("should return expected response body structure", async () => {
        const mockCookieStore = {
            get: vi.fn().mockReturnValue(undefined),
            set: vi.fn(),
        };

        (cookies as any).mockResolvedValue(mockCookieStore);

        const mockRequest = createMockRequest();
        const response = await POST(mockRequest);
        const json = await response.json();

        // Verify response body structure
        expect(json).toHaveProperty("success");
        expect(json).toHaveProperty("message");
        expect(json.success).toBe(true);
        expect(json.message).toBe("Session cleared successfully.");

        // Verify exact match
        expect(json).toEqual({
            success: true,
            message: "Session cleared successfully.",
        });
    });

    /**
     * Test: Handles cookies() function errors
     *
     * Scenario: The Next.js cookies() function itself throws an error.
     * This could happen in rare cases with runtime issues or invalid context.
     *
     * Expected behavior:
     * - Response status is 500 Internal Server Error
     * - Response contains generic error message
     * - Error is logged to console
     *
     * This ensures the endpoint handles unexpected runtime failures gracefully.
     */
    it("should return 500 when cookies() function fails", async () => {
        (cookies as any).mockRejectedValue(
            new Error("Failed to access cookies")
        );

        const mockRequest = createMockRequest();
        const response = await POST(mockRequest);
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json).toEqual({ error: "Internal server error" });
    });
});
