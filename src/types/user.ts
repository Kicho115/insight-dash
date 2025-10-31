export type AppUser = {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
    position: string;
};

export type TeamMemberRole = "owner" | "admin" | "member";

export type TeamMember = {
    userId: string;
    email: string;
    name: string;
    role: TeamMemberRole;
};

export type Team = {
    id: string;
    name: string;
    members: TeamMember[];
    memberIds: string[]; // Denormalized array for fast read queries
    createdAt: Date;
};

// Type for our in-app notification system
export type Invitation = {
    id: string;
    teamId: string;
    teamName: string;
    inviterName: string;
    userEmail: string; // Email of the person being invited
    status: "pending" | "accepted" | "declined";
    createdAt: Date;
};
