"use client";
import { Team, TeamMemberRole } from "@/types/user";

// This service will be used by client components

// Define the shape of the data coming from the API (dates are strings)
// This matches the serialized data from the server
type SerializedTeam = Omit<Team, "createdAt"> & {
    createdAt: string;
};

/**
 * @function createTeam
 * @description Calls the secure API route to create a new team.
 * @param teamName The name for the new team.
 * @returns {Promise<{ success: boolean; error?: Error }>} An object indicating the outcome.
 */
export const createTeam = async (
    teamName: string
): Promise<{ success: boolean; error?: Error }> => {
    try {
        const response = await fetch("/api/teams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: teamName }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to create team.");
        }

        return { success: true };
    } catch (error) {
        console.error("Error creating team:", error);
        return { success: false, error: error as Error };
    }
};

/**
 * @function removeMember
 * @description Calls the API to remove a member from a team.
 * @param teamId - The ID of the team.
 * @param userId - The ID of the user to remove.
 * @returns {Promise<{ success: boolean; error?: Error }>}
 */
export const removeMember = async (
    teamId: string,
    userId: string
): Promise<{ success: boolean; error?: Error }> => {
    try {
        const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
            method: "DELETE",
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to remove member.");
        }
        return { success: true };
    } catch (error) {
        console.error("Error removing member:", error);
        return { success: false, error: error as Error };
    }
};

/**
 * @function updateMemberRole
 * @description Calls the API to update a member's role.
 * @param teamId - The ID of the team.
 * @param userId - The ID of the user to update.
 * @param role - The new role to assign.
 * @returns {Promise<{ success: boolean; error?: Error }>}
 */
export const updateMemberRole = async (
    teamId: string,
    userId: string,
    role: TeamMemberRole
): Promise<{ success: boolean; error?: Error }> => {
    try {
        const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to update role.");
        }
        return { success: true };
    } catch (error) {
        console.error("Error updating role:", error);
        return { success: false, error: error as Error };
    }
};

/**
 * @function getMyTeams
 * @description Fetches the list of teams for the current authenticated user.
 * @returns {Promise<Team[]>} A promise that resolves to an array of teams.
 */
export const getMyTeams = async (): Promise<Team[]> => {
    try {
        const response = await fetch("/api/teams");
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to fetch teams.");
        }

        const teamsData = (await response.json()) as SerializedTeam[];
        // Deserialize date strings
        return teamsData.map((team) => ({
            ...team,
            createdAt: new Date(team.createdAt),
        }));
    } catch (error) {
        console.error("Error fetching teams:", error);
        return []; // Return an empty array on error
    }
};
