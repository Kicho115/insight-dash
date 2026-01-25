import { File, FilePermission } from "@/types/file";

type PermissionRole = "admin" | "edit" | "view";

export const normalizePermissions = (
    permissions: File["permissions"] | FilePermission[] | undefined
): Record<string, PermissionRole> => {
    if (!permissions) {
        return {};
    }

    if (Array.isArray(permissions)) {
        const normalized: Record<string, PermissionRole> = {};
        for (const entry of permissions) {
            if (entry.type === "user" && entry.id) {
                normalized[entry.id] = entry.role;
            }
        }
        return normalized;
    }

    return permissions;
};
