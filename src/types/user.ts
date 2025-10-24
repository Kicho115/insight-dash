export type AppUser = {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    teams: Team[];
    position: string;
};

export type TeamMemberRole = "owner" | "admin" | "member";

export type Team = {
    id: string;
    name: string;
    members: { userId: string; role: TeamMemberRole }[];
};

export type FilePermission = {
    type: "user" | "team";
    id: string; // userId or teamId
    role: "view" | "edit" | "admin";
};

export type FileStatus = "Uploaded" | "Processing" | "Ready" | "Error";

export type File = {
    id: string;
    name: string;
    displayName: string;
    url: string;
    createdAt: Date;
    updatedAt: Date;
    isPublic: boolean;
    creatorId: string;
    path: string;
    size: number;
    permissions: FilePermission[]; // Who can access this file
    isLocked: boolean; // To prevent deletion while other users are using it
    status: FileStatus;
    summary?: string; // File has summary after processing
    headers?: string[]; // Column headers after processing
};
