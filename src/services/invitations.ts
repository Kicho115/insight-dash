"use client";

/**
 * Calls the secure API route to invite a user to a team.
 * @param teamId The ID of the team.
 * @param email The email of the user to invite.
 * @returns {Promise<{ success: boolean; error?: Error }>}
 */
export const sendInvitation = async (
    teamId: string,
    email: string
): Promise<{ success: boolean; error?: Error }> => {
    try {
        const response = await fetch(`/api/teams/${teamId}/invitations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to send invitation.");
        }

        return { success: true };
    } catch (error) {
        console.error("Error sending invitation:", error);
        return { success: false, error: error as Error };
    }
};

/**
 * Calls the secure API route to accept an invitation.
 * @param invitationId The ID of the invitation to accept.
 * @returns {Promise<{ success: boolean; error?: Error }>}
 */
export const acceptInvitation = async (
    invitationId: string
): Promise<{ success: boolean; error?: Error }> => {
    try {
        const response = await fetch(`/api/invitations/${invitationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "accept" }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to accept invitation.");
        }

        return { success: true };
    } catch (error) {
        console.error("Error accepting invitation:", error);
        return { success: false, error: error as Error };
    }
};

/**
 * Calls the secure API route to decline an invitation.
 * @param invitationId The ID of the invitation to decline.
 * @returns {Promise<{ success: boolean; error?: Error }>}
 */
export const declineInvitation = async (
    invitationId: string
): Promise<{ success: boolean; error?: Error }> => {
    try {
        const response = await fetch(`/api/invitations/${invitationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "decline" }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to decline invitation.");
        }

        return { success: true };
    } catch (error) {
        console.error("Error declining invitation:", error);
        return { success: false, error: error as Error };
    }
};
