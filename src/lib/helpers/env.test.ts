import { describe, it, expect, afterEach } from "vitest";
import { optionalEnv } from "./env";

const originalEnv = { ...process.env };

afterEach(() => {
    process.env = { ...originalEnv };
});

describe("env helpers", () => {
    it("returns optional env when present or undefined", () => {
        delete process.env.OPTIONAL_ENV;
        expect(optionalEnv("OPTIONAL_ENV")).toBeUndefined();

        process.env.OPTIONAL_ENV = "present";
        expect(optionalEnv("OPTIONAL_ENV")).toBe("present");
    });
});
