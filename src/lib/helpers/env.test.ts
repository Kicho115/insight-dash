import { describe, it, expect, afterEach } from "vitest";
import { optionalEnv, requireEnv } from "./env";

const originalEnv = { ...process.env };

afterEach(() => {
    process.env = { ...originalEnv };
});

describe("env helpers", () => {
    it("returns required env when present", () => {
        process.env.REQUIRED_ENV = "present";
        expect(requireEnv("REQUIRED_ENV")).toBe("present");
    });

    it("throws when required env is missing", () => {
        delete process.env.MISSING_ENV;
        expect(() => requireEnv("MISSING_ENV")).toThrow(
            "Missing environment variable: MISSING_ENV"
        );
    });

    it("returns optional env when present or undefined", () => {
        delete process.env.OPTIONAL_ENV;
        expect(optionalEnv("OPTIONAL_ENV")).toBeUndefined();

        process.env.OPTIONAL_ENV = "present";
        expect(optionalEnv("OPTIONAL_ENV")).toBe("present");
    });
});
