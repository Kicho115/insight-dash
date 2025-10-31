"use client"; // This service will be used by client components

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
