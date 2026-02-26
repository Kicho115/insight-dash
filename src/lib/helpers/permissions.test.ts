import { describe, it, expect } from "vitest";
import { normalizePermissions } from "./permissions";
import type { FilePermission } from "@/types/file";

describe("normalizePermissions", () => {
    it("returns empty map for missing permissions", () => {
        expect(normalizePermissions(undefined)).toEqual({});
    });

    it("returns map as-is when already normalized", () => {
        const permissions = { userA: "admin", userB: "view" } as const;
        expect(normalizePermissions(permissions)).toEqual(permissions);
    });

    it("normalizes legacy array to a user map", () => {
        const legacy: FilePermission[] = [
            { type: "user", id: "userA", role: "edit" },
            { type: "team", id: "teamA", role: "view" },
            { type: "user", id: "userB", role: "admin" },
        ];

        expect(normalizePermissions(legacy)).toEqual({
            userA: "edit",
            userB: "admin",
        });
    });
});
