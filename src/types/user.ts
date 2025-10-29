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
