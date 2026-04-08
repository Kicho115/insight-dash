/**
 * Test suite for server-side authentication functions.
 *
 * This test file covers the authentication module that handles server-side user
 * session validation using Firebase Admin SDK. The tests ensure that:
 * - getServerAuth correctly extracts user data from valid session cookies
 * - getServerAuth gracefully handles missing or invalid sessions
 * - requireServerAuth throws appropriate errors when authentication is required
 *
 * All external dependencies (Next.js cookies and Firebase Admin) are mocked
 * to allow for isolated unit testing without side effects.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getServerAuth, requireServerAuth, ServerAuthUser } from "@/lib/serverAuth";

/**
 * Mock the Next.js cookies function.
 * This allows us to simulate different cookie states and error conditions
 * without relying on the actual Next.js runtime environment.
 */
vi.mock("next/headers", () => ({
    cookies: vi.fn(),
}));

/**
 * Mock the Firebase Admin SDK.
 * We mock the verifySessionCookie method to control its behavior across
 * different test scenarios, including success cases and error conditions.
 */
vi.mock("@/services/firebase/admin", () => ({
    authAdmin: {
        verifySessionCookie: vi.fn(),
    },
}));

import { cookies } from "next/headers";
import { authAdmin } from "@/services/firebase/admin";

/**
 * Test suite for the getServerAuth function.
 *
 * getServerAuth is responsible for retrieving authenticated user information
 * from a server-side session cookie. It safely handles errors and returns null
 * for any authentication failures rather than throwing exceptions.
 *
 * Test coverage includes:
 * - Happy path: Valid session cookie returns user data
 * - Edge cases: Missing or undefined user properties
 * - Error handling: Invalid tokens, expired sessions, and system errors
 */
describe("getServerAuth", () => {
    /**
     * Clear all mock call histories and implementations before each test.
     * This ensures test isolation and prevents cross-test mock state pollution.
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
     * Test: No session cookie exists
     *
     * Scenario: User attempts to access a protected resource without logging in.
     * The cookies() function returns an empty cookie store.
     *
     * Expected behavior: Function should return null without throwing an error,
     * allowing the application to redirect to the login page.
     *
     * Verifies that the function checks for the "session" cookie.
     */
    it("should return null when no session cookie exists", async () => {
        const mockCookies = {
            get: vi.fn().mockReturnValue(undefined),
        };
        (cookies as any).mockResolvedValue(mockCookies);

        const result = await getServerAuth();

        expect(result).toBeNull();
        expect(mockCookies.get).toHaveBeenCalledWith("session");
    });

    /**
     * Test: Valid session cookie with complete user data
     *
     * Scenario: User has a valid session cookie with all user information
     * (uid, email, and display name). This is the happy path.
     *
     * Expected behavior: Function should decode the session cookie,
     * verify it with Firebase Admin SDK, and return a ServerAuthUser object
     * with properly mapped properties (name -> displayName).
     *
     * Verifies the complete authentication flow and data transformation.
     */
    it("should return ServerAuthUser when session cookie is valid", async () => {
        const mockDecodedToken = {
            uid: "user123",
            email: "user@example.com",
            name: "John Doe",
        };

        const mockCookies = {
            get: vi.fn().mockReturnValue({ value: "valid-session-token" }),
        };
        (cookies as any).mockResolvedValue(mockCookies);
        (authAdmin.verifySessionCookie as any).mockResolvedValue(mockDecodedToken);

        const result = await getServerAuth();

        expect(result).toEqual({
            uid: "user123",
            email: "user@example.com",
            displayName: "John Doe",
        });
        expect(authAdmin.verifySessionCookie).toHaveBeenCalledWith(
            "valid-session-token",
            true
        );
    });

    /**
     * Test: Session token present but email field is missing
     *
     * Scenario: Firebase token is valid but the email field is undefined.
     * This can occur with some authentication methods or custom claims.
     *
     * Expected behavior: Function should handle the missing email gracefully
     * by converting it to null, and return the user object with email: null.
     * The user should still be considered authenticated.
     */
    it("should handle email as null when not present in token", async () => {
        const mockDecodedToken = {
            uid: "user456",
            email: undefined,
            name: "Jane Smith",
        };

        const mockCookies = {
            get: vi.fn().mockReturnValue({ value: "valid-session-token" }),
        };
        (cookies as any).mockResolvedValue(mockCookies);
        (authAdmin.verifySessionCookie as any).mockResolvedValue(mockDecodedToken);

        const result = await getServerAuth();

        expect(result).toEqual({
            uid: "user456",
            email: null,
            displayName: "Jane Smith",
        });
    });

    /**
     * Test: Session token present but display name field is missing
     *
     * Scenario: Firebase token is valid but the name field is undefined.
     * This can happen if the user hasn't set their display name yet.
     *
     * Expected behavior: Function should handle the missing display name by
     * converting it to null, and return the user object with displayName: null.
     * The user should still be authenticated.
     */
    it("should handle displayName as null when not present in token", async () => {
        const mockDecodedToken = {
            uid: "user789",
            email: "user@example.com",
            name: undefined,
        };

        const mockCookies = {
            get: vi.fn().mockReturnValue({ value: "valid-session-token" }),
        };
        (cookies as any).mockResolvedValue(mockCookies);
        (authAdmin.verifySessionCookie as any).mockResolvedValue(mockDecodedToken);

        const result = await getServerAuth();

        expect(result).toEqual({
            uid: "user789",
            email: "user@example.com",
            displayName: null,
        });
    });

    /**
     * Test: Session token present but both email and display name are missing
     *
     * Scenario: Firebase token is valid but completely lacks email and name fields.
     * This represents the minimum viable authenticated user state.
     *
     * Expected behavior: Function should still return a user object with uid
     * and both email and displayName as null. The user remains authenticated
     * based on their uid alone.
     */
    it("should handle both email and displayName as null", async () => {
        const mockDecodedToken = {
            uid: "user000",
            email: undefined,
            name: undefined,
        };

        const mockCookies = {
            get: vi.fn().mockReturnValue({ value: "valid-session-token" }),
        };
        (cookies as any).mockResolvedValue(mockCookies);
        (authAdmin.verifySessionCookie as any).mockResolvedValue(mockDecodedToken);

        const result = await getServerAuth();

        expect(result).toEqual({
            uid: "user000",
            email: null,
            displayName: null,
        });
    });

    /**
     * Test: Session verification throws an error
     *
     * Scenario: A session cookie exists, but Firebase Admin SDK rejects it
     * during verification. This could indicate token tampering or corruption.
     *
     * Expected behavior: Function should catch the error gracefully,
     * log it, and return null without propagating the error to the caller.
     * This prevents application crashes and allows fallback behavior.
     */
    it("should return null when session verification throws an error", async () => {
        const mockCookies = {
            get: vi.fn().mockReturnValue({ value: "invalid-session-token" }),
        };
        (cookies as any).mockResolvedValue(mockCookies);
        (authAdmin.verifySessionCookie as any).mockRejectedValue(
            new Error("Invalid session token")
        );

        const result = await getServerAuth();

        expect(result).toBeNull();
    });

    /**
     * Test: Cookie access system throws an error
     *
     * Scenario: The Next.js cookies() function itself throws an error.
     * This could happen if the runtime environment is not valid for
     * accessing request-scoped data.
     *
     * Expected behavior: Function should catch this error and return null,
     * preventing runtime crashes due to cookie access failures.
     */
    it("should return null when cookies() throws an error", async () => {
        (cookies as any).mockRejectedValue(new Error("Cookie access error"));

        const result = await getServerAuth();

        expect(result).toBeNull();
    });

    /**
     * Test: Session cookie has expired
     *
     * Scenario: Session cookie exists and is properly formed, but its
     * expiration timestamp has passed. Firebase Admin SDK detects this.
     *
     * Expected behavior: Function should return null, treating the expired
     * session as an invalid authentication state. This requires users to
     * log in again with fresh credentials.
     */
    it("should handle expired session cookie", async () => {
        const mockCookies = {
            get: vi.fn().mockReturnValue({ value: "expired-token" }),
        };
        (cookies as any).mockResolvedValue(mockCookies);
        (authAdmin.verifySessionCookie as any).mockRejectedValue(
            new Error("Session cookie expired")
        );

        const result = await getServerAuth();

        expect(result).toBeNull();
    });
});

/**
 * Test suite for the requireServerAuth function.
 *
 * requireServerAuth is a stricter version of getServerAuth that throws an error
 * when authentication fails. It's used in contexts where authentication is mandatory
 * and the application should not proceed without a valid user session.
 *
 * Test coverage includes:
 * - Happy path: Valid session returns authenticated user
 * - Error case: Various failure scenarios throw "Authentication required" error
 * - Edge cases: Missing user properties are handled correctly
 */
describe("requireServerAuth", () => {
    /**
     * Clear all mock call histories and implementations before each test.
     * This ensures test isolation and prevents cross-test mock state pollution.
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
     * Test: Valid authentication returns user object
     *
     * Scenario: User has a valid session and attempts to access a protected
     * operation that requires authentication. This is the happy path.
     *
     * Expected behavior: Function should retrieve and return the authenticated
     * user object without throwing an error. The calling code can safely assume
     * the user is authenticated and proceed with the operation.
     */
    it("should return ServerAuthUser when user is authenticated", async () => {
        const mockUser: ServerAuthUser = {
            uid: "user123",
            email: "user@example.com",
            displayName: "John Doe",
        };

        const mockCookies = {
            get: vi.fn().mockReturnValue({ value: "valid-session-token" }),
        };
        (cookies as any).mockResolvedValue(mockCookies);
        (authAdmin.verifySessionCookie as any).mockResolvedValue({
            uid: mockUser.uid,
            email: mockUser.email,
            name: mockUser.displayName,
        });

        const result = await requireServerAuth();

        expect(result).toEqual(mockUser);
    });

    /**
     * Test: No session cookie throws authentication error
     *
     * Scenario: User is not logged in and no session cookie exists.
     * The application attempts to perform an authenticated operation.
     *
     * Expected behavior: Function should throw an error with the message
     * "Authentication required". The calling code should catch this and
     * redirect the user to the login page.
     */
    it("should throw 'Authentication required' error when no session cookie exists", async () => {
        const mockCookies = {
            get: vi.fn().mockReturnValue(undefined),
        };
        (cookies as any).mockResolvedValue(mockCookies);

        await expect(requireServerAuth()).rejects.toThrow("Authentication required");
    });

    /**
     * Test: Invalid session cookie throws authentication error
     *
     * Scenario: A session cookie exists but is malformed, tampered with, or
     * otherwise invalid. Firebase Admin SDK rejects it during verification.
     *
     * Expected behavior: Function should throw an error with the message
     * "Authentication required". The application should treat this as an
     * authentication failure and redirect to login.
     */
    it("should throw 'Authentication required' error when session verification fails", async () => {
        const mockCookies = {
            get: vi.fn().mockReturnValue({ value: "invalid-token" }),
        };
        (cookies as any).mockResolvedValue(mockCookies);
        (authAdmin.verifySessionCookie as any).mockRejectedValue(
            new Error("Invalid token")
        );

        await expect(requireServerAuth()).rejects.toThrow("Authentication required");
    });

    /**
     * Test: Expired session cookie throws authentication error
     *
     * Scenario: The session cookie exists and is properly formatted, but it has
     * expired and is no longer valid. The user needs to log in again.
     *
     * Expected behavior: Function should throw an error with the message
     * "Authentication required". The calling code should redirect the user
     * to login with their credentials.
     */
    it("should throw 'Authentication required' error when session is expired", async () => {
        const mockCookies = {
            get: vi.fn().mockReturnValue({ value: "expired-token" }),
        };
        (cookies as any).mockResolvedValue(mockCookies);
        (authAdmin.verifySessionCookie as any).mockRejectedValue(
            new Error("Session expired")
        );

        await expect(requireServerAuth()).rejects.toThrow("Authentication required");
    });

    /**
     * Test: Valid session with missing email returns user
     *
     * Scenario: User is authenticated but their email field is undefined
     * in the Firebase token. The application requires user authentication
     * but can work with null email values.
     *
     * Expected behavior: Function should return the user object with email
     * set to null. Authentication is successful based on the valid uid.
     * The missing email should not prevent authentication.
     */
    it("should return user with null email when email is not in token", async () => {
        const mockCookies = {
            get: vi.fn().mockReturnValue({ value: "valid-session-token" }),
        };
        (cookies as any).mockResolvedValue(mockCookies);
        (authAdmin.verifySessionCookie as any).mockResolvedValue({
            uid: "user456",
            email: undefined,
            name: "Jane Smith",
        });

        const result = await requireServerAuth();

        expect(result).toEqual({
            uid: "user456",
            email: null,
            displayName: "Jane Smith",
        });
    });

    /**
     * Test: Valid session with missing display name returns user
     *
     * Scenario: User is authenticated but their display name field is undefined
     * in the Firebase token. The application requires user authentication
     * but can work with null displayName values.
     *
     * Expected behavior: Function should return the user object with displayName
     * set to null. Authentication is successful based on the valid uid.
     * The missing display name should not prevent authentication.
     */
    it("should return user with null displayName when name is not in token", async () => {
        const mockCookies = {
            get: vi.fn().mockReturnValue({ value: "valid-session-token" }),
        };
        (cookies as any).mockResolvedValue(mockCookies);
        (authAdmin.verifySessionCookie as any).mockResolvedValue({
            uid: "user789",
            email: "user@example.com",
            name: undefined,
        });

        const result = await requireServerAuth();

        expect(result).toEqual({
            uid: "user789",
            email: "user@example.com",
            displayName: null,
        });
    });
});
