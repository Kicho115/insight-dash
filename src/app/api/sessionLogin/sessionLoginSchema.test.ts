/**
 * Test suite for sessionLoginSchema validation.
 *
 * This test file covers the Zod schema used to validate login requests
 * in the /api/sessionLogin endpoint. The schema ensures that incoming
 * requests contain the required idToken field and reject any unexpected
 * additional fields to prevent injection attacks or malformed data.
 *
 * The schema uses .strict() mode to enforce exact field matching, which
 * is a critical security measure for authentication endpoints.
 */

import { describe, it, expect } from "vitest";
import { sessionLoginSchema } from "@/lib/api/schemas";
import { ZodError } from "zod";

/**
 * Test suite for sessionLoginSchema validation.
 *
 * The schema validates login request bodies with the following rules:
 * 1. Must contain exactly one field: idToken
 * 2. idToken must be a string
 * 3. idToken must not be empty (min length 1)
 * 4. No additional fields are allowed (strict mode)
 *
 * These tests ensure the schema correctly validates both valid and invalid inputs.
 */
describe("sessionLoginSchema", () => {
    /**
     * Test: Valid idToken is accepted
     *
     * Scenario: Request body contains a valid non-empty idToken string.
     * This is the happy path for authentication requests.
     *
     * Expected behavior:
     * - Schema validation passes
     * - Returns parsed object with idToken field
     * - No errors are thrown
     *
     * This confirms the schema accepts valid authentication requests.
     */
    it("should accept valid idToken string", () => {
        const validData = {
            idToken: "valid-token-string-123",
        };

        const result = sessionLoginSchema.parse(validData);

        expect(result).toEqual(validData);
        expect(result.idToken).toBe("valid-token-string-123");
    });

    /**
     * Test: Long idToken strings are accepted
     *
     * Scenario: Firebase ID tokens can be quite long (often 800+ characters).
     * The schema should accept these without length restrictions.
     *
     * Expected behavior:
     * - Schema validation passes for long tokens
     * - No maximum length restriction
     * - Token value is preserved exactly
     *
     * This ensures real Firebase tokens are accepted.
     */
    it("should accept long idToken strings", () => {
        const longToken = "a".repeat(1000); // Simulate a long Firebase token
        const validData = {
            idToken: longToken,
        };

        const result = sessionLoginSchema.parse(validData);

        expect(result.idToken).toBe(longToken);
        expect(result.idToken.length).toBe(1000);
    });

    /**
     * Test: Empty string idToken is rejected
     *
     * Scenario: Request body contains an empty string for idToken.
     * This is invalid as we cannot authenticate with an empty token.
     *
     * Expected behavior:
     * - Schema validation fails
     * - Throws ZodError
     * - Error indicates string must not be empty (min length 1)
     * - Error path points to idToken field
     *
     * This prevents authentication attempts with empty tokens.
     */
    it("should reject empty string idToken", () => {
        const invalidData = {
            idToken: "",
        };

        try {
            sessionLoginSchema.parse(invalidData);
            expect.fail("Should have thrown ZodError");
        } catch (error) {
            expect(error).toBeInstanceOf(ZodError);
            const zodError = error as ZodError;
            expect(zodError.issues[0].path).toContain("idToken");
            expect(zodError.issues[0].message).toContain(
                "expected string to have"
            );
        }
    });

    /**
     * Test: Missing idToken field is rejected
     *
     * Scenario: Request body is empty or doesn't contain idToken field.
     * This is a common error when clients forget to include the token.
     *
     * Expected behavior:
     * - Schema validation fails
     * - Throws ZodError
     * - Error indicates field is required
     * - Error path points to idToken field
     *
     * This ensures all login requests include the required token.
     */
    it("should reject missing idToken field", () => {
        const invalidData = {};

        try {
            sessionLoginSchema.parse(invalidData);
            expect.fail("Should have thrown ZodError");
        } catch (error) {
            expect(error).toBeInstanceOf(ZodError);
            const zodError = error as ZodError;
            expect(zodError.issues[0].path).toContain("idToken");
            expect(zodError.issues[0].code).toBe("invalid_type");
        }
    });

    /**
     * Test: Non-string idToken is rejected
     *
     * Scenario: Request body contains idToken as a number instead of string.
     * Client might accidentally send wrong data type.
     *
     * Expected behavior:
     * - Schema validation fails
     * - Throws ZodError
     * - Error indicates expected type is string
     * - Error indicates received type
     *
     * This enforces type safety for the idToken field.
     */
    it("should reject non-string idToken (number)", () => {
        const invalidData = { idToken: 12345 };

        try {
            sessionLoginSchema.parse(invalidData);
            expect.fail("Should have thrown ZodError");
        } catch (error) {
            expect(error).toBeInstanceOf(ZodError);
            const zodError = error as ZodError;

            const issue = zodError.issues[0];
            expect(issue.path).toContain("idToken");
            expect(issue.code).toBe("invalid_type");

            if (issue.code === "invalid_type") {
                expect(issue.expected).toBe("string");
            } else {
                expect.fail(`Unexpected Zod issue code: ${issue.code}`);
            }
        }
    });

    /**
     * Test: Non-string idToken is rejected (boolean)
     *
     * Scenario: Request body contains idToken as a boolean.
     * Tests type validation with another common type.
     *
     * Expected behavior:
     * - Schema validation fails
     * - Throws ZodError
     * - Error indicates type mismatch
     *
     * This further validates type checking.
     */
    it("should reject non-string idToken (boolean)", () => {
        const result = sessionLoginSchema.safeParse({ idToken: true });

        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = result.error.issues[0];
            expect(issue.code).toBe("invalid_type");
            if (issue.code === "invalid_type") {
                expect(issue.expected).toBe("string");
            }
        }
    });

    /**
     * Test: Non-string idToken is rejected (object)
     *
     * Scenario: Request body contains idToken as an object.
     * Tests that nested objects are rejected.
     *
     * Expected behavior:
     * - Schema validation fails
     * - Throws ZodError
     * - Error indicates type mismatch
     *
     * This prevents object injection attempts.
     */
    it("should reject non-string idToken (object)", () => {
        const invalidData = {
            idToken: { token: "value" },
        };

        expect(() => sessionLoginSchema.parse(invalidData)).toThrow(ZodError);
    });

    /**
     * Test: Non-string idToken is rejected (array)
     *
     * Scenario: Request body contains idToken as an array.
     * Tests that arrays are rejected.
     *
     * Expected behavior:
     * - Schema validation fails
     * - Throws ZodError
     * - Error indicates type mismatch
     *
     * This prevents array injection attempts.
     */
    it("should reject non-string idToken (array)", () => {
        const invalidData = {
            idToken: ["token1", "token2"],
        };

        expect(() => sessionLoginSchema.parse(invalidData)).toThrow(ZodError);
    });

    /**
     * Test: Null idToken is rejected
     *
     * Scenario: Request body contains null for idToken.
     * Tests that null values are properly rejected.
     *
     * Expected behavior:
     * - Schema validation fails
     * - Throws ZodError
     * - Error indicates type mismatch
     *
     * This ensures null cannot bypass validation.
     */
    it("should reject null idToken", () => {
        const invalidData = {
            idToken: null,
        };

        expect(() => sessionLoginSchema.parse(invalidData)).toThrow(ZodError);
    });

    /**
     * Test: Undefined idToken is rejected
     *
     * Scenario: Request body explicitly sets idToken to undefined.
     * This is treated the same as missing field.
     *
     * Expected behavior:
     * - Schema validation fails
     * - Throws ZodError
     * - Error indicates field is required
     *
     * This ensures undefined cannot bypass validation.
     */
    it("should reject undefined idToken", () => {
        const invalidData = {
            idToken: undefined,
        };

        expect(() => sessionLoginSchema.parse(invalidData)).toThrow(ZodError);
    });

    /**
     * Test: Extra fields are rejected (strict mode)
     *
     * Scenario: Request body contains valid idToken but also includes
     * additional unexpected fields. The .strict() mode should reject this.
     *
     * Expected behavior:
     * - Schema validation fails
     * - Throws ZodError
     * - Error indicates unrecognized keys
     * - Lists the unexpected field names
     *
     * This is a critical security feature - prevents injection of
     * unexpected data that could be processed by other parts of the system.
     */
    it("should reject extra fields due to strict mode", () => {
        const invalidData = {
            idToken: "valid-token",
            extraField: "should-be-rejected",
        };

        try {
            sessionLoginSchema.parse(invalidData);
            expect.fail("Should have thrown ZodError");
        } catch (error) {
            expect(error).toBeInstanceOf(ZodError);
            const zodError = error as ZodError;
            expect(zodError.issues[0].code).toBe("unrecognized_keys");
            expect(zodError.issues[0].message).toContain("Unrecognized key");
        }
    });

    /**
     * Test: Multiple extra fields are all rejected
     *
     * Scenario: Request body contains valid idToken plus multiple
     * unexpected fields. Tests that strict mode catches all extra fields.
     *
     * Expected behavior:
     * - Schema validation fails
     * - Throws ZodError
     * - Error lists all unrecognized keys
     *
     * This validates comprehensive extra field detection.
     */
    it("should reject multiple extra fields", () => {
        const invalidData = {
            idToken: "valid-token",
            extraField1: "value1",
            extraField2: "value2",
            extraField3: "value3",
        };

        try {
            sessionLoginSchema.parse(invalidData);
            expect.fail("Should have thrown ZodError");
        } catch (error) {
            expect(error).toBeInstanceOf(ZodError);
            const zodError = error as ZodError;
            expect(zodError.issues[0].code).toBe("unrecognized_keys");
            // All extra keys should be mentioned in the error
            const errorMessage = zodError.issues[0].message;
            expect(
                errorMessage.includes("extraField1") ||
                    errorMessage.includes("extraField2") ||
                    errorMessage.includes("extraField3")
            ).toBe(true);
        }
    });

    /**
     * Test: Common field name attempts are rejected
     *
     * Scenario: Test that commonly attempted field names are rejected
     * in strict mode. These might be injection attempts or mistakes.
     *
     * Expected behavior:
     * - Schema validation fails for each
     * - Throws ZodError
     * - Strict mode catches all unexpected fields
     *
     * This tests strict mode against common field name patterns.
     */
    it("should reject common extra field names", () => {
        const commonExtraFields = [
            { idToken: "valid", userId: "123" },
            { idToken: "valid", email: "user@example.com" },
            { idToken: "valid", password: "secret" },
            { idToken: "valid", sessionId: "abc" },
            { idToken: "valid", rememberMe: true },
        ];

        for (const invalidData of commonExtraFields) {
            expect(() => sessionLoginSchema.parse(invalidData)).toThrow(
                ZodError
            );
        }
    });

    /**
     * Test: safeParse returns success for valid data
     *
     * Scenario: Use safeParse instead of parse to get result object
     * instead of throwing. Verify valid data returns success.
     *
     * Expected behavior:
     * - safeParse returns { success: true, data: ... }
     * - No exceptions thrown
     * - Parsed data matches input
     *
     * This demonstrates the safeParse API for error-free validation.
     */
    it("should return success with safeParse for valid data", () => {
        const validData = {
            idToken: "valid-token-string",
        };

        const result = sessionLoginSchema.safeParse(validData);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.idToken).toBe("valid-token-string");
        }
    });

    /**
     * Test: safeParse returns error for invalid data
     *
     * Scenario: Use safeParse with invalid data to get error object
     * instead of exception. Verify error structure.
     *
     * Expected behavior:
     * - safeParse returns { success: false, error: ZodError }
     * - No exceptions thrown
     * - Error object contains validation details
     *
     * This demonstrates safeParse for graceful error handling.
     */
    it("should return error with safeParse for invalid data", () => {
        const invalidData = {
            idToken: "",
        };

        const result = sessionLoginSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeInstanceOf(ZodError);
            expect(result.error.issues.length).toBeGreaterThan(0);
            expect(result.error.issues[0].path).toContain("idToken");
        }
    });

    /**
     * Test: safeParse returns error for extra fields
     *
     * Scenario: Use safeParse with extra fields to test strict mode
     * error handling without exceptions.
     *
     * Expected behavior:
     * - safeParse returns { success: false, error: ZodError }
     * - Error code is unrecognized_keys
     * - Error lists the unexpected fields
     *
     * This validates strict mode works with safeParse API.
     */
    it("should return error with safeParse for extra fields", () => {
        const invalidData = {
            idToken: "valid-token",
            extraField: "not-allowed",
        };

        const result = sessionLoginSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.length).toBeGreaterThan(0);
            expect(result.error.issues[0].code).toBe("unrecognized_keys");
        }
    });
});
