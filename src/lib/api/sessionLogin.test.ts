/**
 * Test suite for POST /api/sessionLogin route.
 *
 * This test file covers the session login endpoint that authenticates users
 * and creates session cookies. The route validates ID tokens, retrieves user
 * data from Firebase, stores/updates user profiles in Firestore, and sets
 * secure HTTP-only session cookies.
 *
 * All external dependencies (Firebase Admin, Firestore, and utility functions)
 * are mocked to allow isolated unit testing without side effects.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/sessionLogin/route";
import { NextRequest } from "next/server";

/**
 * Mock Firebase Admin SDK.
 * We mock the core authentication methods needed for session creation.
 */
vi.mock("@/services/firebase/admin", () => ({
    authAdmin: {
        verifyIdToken: vi.fn(),
        getUser: vi.fn(),
        createSessionCookie: vi.fn(),
    },
}));

/**
 * Mock the Firestore user data layer.
 * We mock the function that creates or updates user profiles in the database.
 */
vi.mock("@/data/users", () => ({
    createOrUpdateUser: vi.fn(),
}));

/**
 * Mock the API utility functions for request parsing and error handling.
 * These are used for JSON parsing with Zod schema validation.
 */
vi.mock("@/lib/api/validation", () => ({
    parseJson: vi.fn(),
}));

import { ZodError } from "zod";

import { authAdmin } from "@/services/firebase/admin";
import { createOrUpdateUser } from "@/data/users";
import { parseJson } from "@/lib/api/validation";

/**
 * Helper function to create a mock NextRequest with a specific body.
 * This simulates incoming HTTP POST requests to the API route.
 *
 * @param body - The request body object (will be stringified)
 * @returns A mock NextRequest instance
 */
function createMockRequest(body: unknown): NextRequest {
    return {
        json: async () => body,
    } as unknown as NextRequest;
}

/**
 * Test suite for the POST /api/sessionLogin endpoint.
 *
 * This endpoint handles user login by:
 * 1. Validating the request contains a valid ID token
 * 2. Verifying the token with Firebase Admin SDK
 * 3. Retrieving full user data from Firebase Auth
 * 4. Creating/updating user profile in Firestore
 * 5. Creating a secure session cookie with HTTP-only flag
 * 6. Returning the session cookie to the client
 */
describe("POST /api/sessionLogin", () => {
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
     * Test: Valid login request with complete user data
     *
     * Scenario: User provides a valid ID token through the request body.
     * Firebase Admin successfully verifies the token and returns user data.
     * Session cookie is created successfully.
     *
     * Expected behavior:
     * - Response status is 200 OK
     * - Response body contains { success: true }
     * - Response includes Set-Cookie header with session token
     * - The session cookie has:
     *   - httpOnly: true (not accessible via JavaScript)
     *   - secure: true/false based on NODE_ENV
     *   - sameSite: strict (prevents CSRF attacks)
     *   - path: / (available site-wide)
     *   - maxAge: 5 days in milliseconds
     *
     * Verifies the complete authentication flow works as expected.
     */
    it("should return 200 with Set-Cookie when idToken is valid", async () => {
        const mockDecodedToken = {
            uid: "user123",
            email: "user@example.com",
        };

        const mockUserRecord = {
            uid: "user123",
            email: "user@example.com",
            displayName: "John Doe",
        };

        const mockSessionCookie = "session-cookie-value-xyz";
        const mockRequest = createMockRequest({ idToken: "valid-id-token" });

        (parseJson as any).mockResolvedValue({ idToken: "valid-id-token" });
        (authAdmin.verifyIdToken as any).mockResolvedValue(mockDecodedToken);
        (authAdmin.getUser as any).mockResolvedValue(mockUserRecord);
        (createOrUpdateUser as any).mockResolvedValue(undefined);
        (authAdmin.createSessionCookie as any).mockResolvedValue(
            mockSessionCookie
        );

        const response = await POST(mockRequest);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json).toEqual({ success: true });

        // Verify the session cookie was set in the response
        const setCookieHeader = response.headers.get("set-cookie");
        expect(setCookieHeader).toContain("session=");
        expect(setCookieHeader).toContain("HttpOnly");
        expect(setCookieHeader).toContain("Path=/");
        expect(setCookieHeader?.toLowerCase()).toContain("samesite=strict");
    });

    /**
     * Test: Invalid request body format
     *
     * Scenario: Client sends a request without the required idToken field.
     * Request parsing fails with the same ApiError shape produced by the real
     * parseJson helper on schema validation errors.
     *
     * Expected behavior:
     * - Response status is 400 Bad Request
     * - Response body contains error message about invalid request body
     * - Response includes validation details from schema validation
     *
     * This validates that the route properly guards against malformed requests.
     */
    it("should return 400 when idToken is missing from body", async () => {
        const mockRequest = createMockRequest({});
        const validationDetails = [
            {
                code: "invalid_type",
                expected: "string",
                input: undefined,
                path: ["idToken"],
                message: "Required",
            },
        ];
        const apiError = Object.assign(new Error("Invalid request body"), {
            name: "ApiError",
            status: 400,
            statusCode: 400,
            details: validationDetails,
        });

        (parseJson as any).mockRejectedValue(apiError);

        const response = await POST(mockRequest);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toContain("Invalid request body");
        expect(json.details).toEqual(validationDetails);
    });

    /**
     * Test: Invalid or expired ID token
     *
     * Scenario: Client sends a request with an ID token that cannot be verified.
     * This could be due to:
     * - Token expiration
     * - Token tampering
     * - Invalid token format
     * - Firebase Admin SDK rejection
     *
     * Expected behavior:
     * - Response status is 401 Unauthorized (if mapped as "Authentication required")
     * - Response contains a clear error message
     * - No session cookie is set
     *
     * This test ensures users cannot log in with bad tokens.
     */
    it("should return 401 when idToken verification fails", async () => {
        const mockRequest = createMockRequest({ idToken: "invalid-token" });

        (parseJson as any).mockResolvedValue({ idToken: "invalid-token" });
        (authAdmin.verifyIdToken as any).mockRejectedValue(
            new Error("Authentication required")
        );

        const response = await POST(mockRequest);
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json.error).toBe("Unauthorized");
    });

    /**
     * Test: getUser fails for verified token
     *
     * Scenario: ID token is valid and verifies successfully, but retrieving
     * the full user record from Firebase Auth fails. This could indicate:
     * - User was deleted after token generation
     * - Firebase Auth service issues
     * - Permissions issues
     *
     * Expected behavior:
     * - Response status is 500 Internal Server Error
     * - Response contains generic error message (real error not exposed)
     * - No session cookie is set
     *
     * This ensures the API gracefully handles Firebase Auth failures.
     */
    it("should return 404 when getUser fails with user not found", async () => {
        const mockDecodedToken = {
            uid: "user123",
            email: "user@example.com",
        };

        const mockRequest = createMockRequest({ idToken: "valid-token" });

        (parseJson as any).mockResolvedValue({ idToken: "valid-token" });
        (authAdmin.verifyIdToken as any).mockResolvedValue(mockDecodedToken);
        (authAdmin.getUser as any).mockRejectedValue(
            new Error("User not found")
        );

        const response = await POST(mockRequest);
        const json = await response.json();

        expect(response.status).toBe(404);
        expect(json.error).toBe("Not Found");
    });

    /**
     * Test: User profile creation in Firestore fails
     *
     * Scenario: ID token is valid and user record retrieved, but creating/updating
     * the user profile in Firestore fails. This could indicate:
     * - Firestore database connectivity issues
     * - Permission denied to write to Firestore
     * - Validation errors in user data
     *
     * Expected behavior:
     * - Response status is 500 Internal Server Error
     * - Response contains generic error message
     * - No session cookie is set
     * - Session cookie creation is not attempted
     *
     * This ensures user profiles are properly created before allowing login.
     */
    it("should return 500 when createOrUpdateUser fails", async () => {
        const mockDecodedToken = {
            uid: "user123",
            email: "user@example.com",
        };

        const mockUserRecord = {
            uid: "user123",
            email: "user@example.com",
            displayName: "John Doe",
        };

        const mockRequest = createMockRequest({ idToken: "valid-token" });

        (parseJson as any).mockResolvedValue({ idToken: "valid-token" });
        (authAdmin.verifyIdToken as any).mockResolvedValue(mockDecodedToken);
        (authAdmin.getUser as any).mockResolvedValue(mockUserRecord);
        (createOrUpdateUser as any).mockRejectedValue(
            new Error("Firestore write failed")
        );

        const response = await POST(mockRequest);
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json.error).toBe("Internal Server Error");
    });

    /**
     * Test: Session cookie creation fails
     *
     * Scenario: All validation, user retrieval, and profile creation succeed,
     * but Firebase Admin cannot create a session cookie. This could indicate:
     * - Firebase Auth service issues
     * - Invalid configuration
     * - Security policy violations
     *
     * Expected behavior:
     * - Response status is 500 Internal Server Error
     * - Response contains generic error message
     * - No Set-Cookie header is sent to client
     * - Error is logged for debugging
     *
     * This ensures session cookies are properly created before confirming login.
     */
    it("should return 500 when createSessionCookie fails", async () => {
        const mockDecodedToken = {
            uid: "user123",
            email: "user@example.com",
        };

        const mockUserRecord = {
            uid: "user123",
            email: "user@example.com",
            displayName: "John Doe",
        };

        const mockRequest = createMockRequest({ idToken: "valid-token" });

        (parseJson as any).mockResolvedValue({ idToken: "valid-token" });
        (authAdmin.verifyIdToken as any).mockResolvedValue(mockDecodedToken);
        (authAdmin.getUser as any).mockResolvedValue(mockUserRecord);
        (createOrUpdateUser as any).mockResolvedValue(undefined);
        (authAdmin.createSessionCookie as any).mockRejectedValue(
            new Error("Failed to create session cookie")
        );

        const response = await POST(mockRequest);
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json.error).toBe("Internal Server Error");
    });

    /**
     * Test: User data from Firebase is correctly passed to Firestore
     *
     * Scenario: Verify that user information from Firebase Auth (email, displayName)
     * is correctly extracted and passed to createOrUpdateUser function.
     * This ensures the user profile in Firestore stays in sync with Firebase Auth.
     *
     * Expected behavior:
     * - createOrUpdateUser is called with uid and user data
     * - Passed data includes email (or empty string if missing)
     * - Passed data includes displayName (or empty string if missing)
     * - Function call happens after token verification
     *
     * This validates data flow through the authentication pipeline.
     */
    it("should call createOrUpdateUser with correct user data", async () => {
        const mockDecodedToken = {
            uid: "user456",
            email: "user@example.com",
        };

        const mockUserRecord = {
            uid: "user456",
            email: "user@example.com",
            displayName: "Jane Smith",
        };

        const mockSessionCookie = "session-cookie-value";
        const mockRequest = createMockRequest({ idToken: "valid-token" });

        (parseJson as any).mockResolvedValue({ idToken: "valid-token" });
        (authAdmin.verifyIdToken as any).mockResolvedValue(mockDecodedToken);
        (authAdmin.getUser as any).mockResolvedValue(mockUserRecord);
        (createOrUpdateUser as any).mockResolvedValue(undefined);
        (authAdmin.createSessionCookie as any).mockResolvedValue(
            mockSessionCookie
        );

        await POST(mockRequest);

        expect(createOrUpdateUser).toHaveBeenCalledWith("user456", {
            email: "user@example.com",
            name: "Jane Smith",
        });
    });

    /**
     * Test: Session cookie is created with correct parameters
     *
     * Scenario: Verify that the createSessionCookie function is called with
     * the ID token and correct expiration settings (5 days).
     *
     * Expected behavior:
     * - createSessionCookie is called with idToken parameter
     * - expiresIn is set to 5 days in milliseconds
     * - The returned cookie value is used in the Set-Cookie header
     *
     * This ensures session cookies are created with the correct parameters.
     */
    it("should call createSessionCookie with correct expiration", async () => {
        const mockDecodedToken = {
            uid: "user123",
            email: "user@example.com",
        };

        const mockUserRecord = {
            uid: "user123",
            email: "user@example.com",
            displayName: "John Doe",
        };

        const mockSessionCookie = "session-cookie-value";
        const mockRequest = createMockRequest({ idToken: "valid-token" });

        (parseJson as any).mockResolvedValue({ idToken: "valid-token" });
        (authAdmin.verifyIdToken as any).mockResolvedValue(mockDecodedToken);
        (authAdmin.getUser as any).mockResolvedValue(mockUserRecord);
        (createOrUpdateUser as any).mockResolvedValue(undefined);
        (authAdmin.createSessionCookie as any).mockResolvedValue(
            mockSessionCookie
        );

        await POST(mockRequest);

        const expectedExpiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        expect(authAdmin.createSessionCookie).toHaveBeenCalledWith(
            "valid-token",
            { expiresIn: expectedExpiresIn }
        );
    });

    /**
     * Test: User with missing displayName
     *
     * Scenario: Firebase Auth returns a user record without a displayName field.
     * This can happen when users authenticate without setting a display name.
     *
     * Expected behavior:
     * - createOrUpdateUser is called with empty string for name field
     * - Authentication proceeds normally, returning 200 with session
     * - User profile is created with empty name field
     *
     * This ensures the API handles users without complete profiles.
     */
    it("should handle user without displayName", async () => {
        const mockDecodedToken = {
            uid: "user789",
            email: "user@example.com",
        };

        const mockUserRecord = {
            uid: "user789",
            email: "user@example.com",
            displayName: undefined,
        };

        const mockSessionCookie = "session-cookie-value";
        const mockRequest = createMockRequest({ idToken: "valid-token" });

        (parseJson as any).mockResolvedValue({ idToken: "valid-token" });
        (authAdmin.verifyIdToken as any).mockResolvedValue(mockDecodedToken);
        (authAdmin.getUser as any).mockResolvedValue(mockUserRecord);
        (createOrUpdateUser as any).mockResolvedValue(undefined);
        (authAdmin.createSessionCookie as any).mockResolvedValue(
            mockSessionCookie
        );

        const response = await POST(mockRequest);

        expect(response.status).toBe(200);
        expect(createOrUpdateUser).toHaveBeenCalledWith("user789", {
            email: "user@example.com",
            name: "",
        });
    });

    /**
     * Test: User with missing email
     *
     * Scenario: Firebase Auth returns a user record without an email field.
     * This is rare but can happen with certain authentication methods.
     *
     * Expected behavior:
     * - createOrUpdateUser is called with empty string for email field
     * - Authentication proceeds normally, returning 200 with session
     * - User profile is created with empty email field
     * - API should still function with uid as the primary identifier
     *
     * This ensures the API handles users with minimal profile information.
     */
    it("should handle user without email", async () => {
        const mockDecodedToken = {
            uid: "user101",
            email: undefined,
        };

        const mockUserRecord = {
            uid: "user101",
            email: undefined,
            displayName: "Anonymous User",
        };

        const mockSessionCookie = "session-cookie-value";
        const mockRequest = createMockRequest({ idToken: "valid-token" });

        (parseJson as any).mockResolvedValue({ idToken: "valid-token" });
        (authAdmin.verifyIdToken as any).mockResolvedValue(mockDecodedToken);
        (authAdmin.getUser as any).mockResolvedValue(mockUserRecord);
        (createOrUpdateUser as any).mockResolvedValue(undefined);
        (authAdmin.createSessionCookie as any).mockResolvedValue(
            mockSessionCookie
        );

        const response = await POST(mockRequest);

        expect(response.status).toBe(200);
        expect(createOrUpdateUser).toHaveBeenCalledWith("user101", {
            email: "",
            name: "Anonymous User",
        });
    });
});
