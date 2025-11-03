import "server-only";
import { dbAdmin } from "@/services/firebase/admin";
import { Invitation, TeamMember, AppUser } from "@/types/user";
import { FieldValue } from "firebase-admin/firestore";
import { findUserByEmail } from "./users"; // Import from users DAL
import { getTeamById } from "./teams"; // Import from teams DAL

/**
 * Creates an invitation for a user to join a team.
 * @param teamId - The ID of the team.
 * @param inviter - The authenticated user sending the invite.
 * @param inviteeEmail - The email of the user to invite.
 * @throws Will throw errors if user not found, already in team, or invite exists.
 */
export async function createInvitation(
    teamId: string,
    inviter: AppUser,
    inviteeEmail: string
): Promise<Invitation> {
    // 1. Find the user being invited
    const invitee = await findUserByEmail(inviteeEmail);
    if (!invitee) {
        throw new Error("A user with this email was not found.");
    }
    if (invitee.id === inviter.id) {
        throw new Error("You cannot invite yourself to your own team.");
    }

    // 2. Get team details to check for existing members
    const team = await getTeamById(teamId, inviter.id); // Verifies inviter is a member
    if (team.memberIds.includes(invitee.id)) {
        throw new Error("This user is already a member of the team.");
    }

    // 3. Check for an existing pending invitation
    const inviteQuery = await dbAdmin
        .collection("invitations")
        .where("teamId", "==", teamId)
        .where("userEmail", "==", inviteeEmail)
        .where("status", "==", "pending")
        .limit(1)
        .get();

    if (!inviteQuery.empty) {
        throw new Error(
            "An invitation for this user to this team is already pending."
        );
    }

    // 4. Create the invitation document
    const newInviteRef = dbAdmin.collection("invitations").doc();
    const newInvitation: Invitation = {
        id: newInviteRef.id,
        teamId: team.id,
        teamName: team.name,
        inviterName: inviter.name,
        userEmail: inviteeEmail, // Store email for the invitee
        userId: invitee.id, // NEW: Add userId for easier querying
        status: "pending",
        createdAt: new Date(), // Will be replaced by serverTimestamp
    };

    await newInviteRef.set({
        ...newInvitation,
        createdAt: FieldValue.serverTimestamp(),
    });

    return newInvitation;
}

/**
 * Accepts an invitation and adds the user to the team.
 * @param invitationId - The ID of the invitation.
 * @param user - The authenticated user accepting the invite.
 * @throws Will throw error if invitation is not found or not for this user.
 */
export async function acceptInvitation(
    invitationId: string,
    user: AppUser
): Promise<void> {
    const inviteRef = dbAdmin.collection("invitations").doc(invitationId);
    const teamRef = dbAdmin.collection("teams");

    // Use a transaction to ensure atomicity
    await dbAdmin.runTransaction(async (transaction) => {
        const inviteDoc = await transaction.get(inviteRef);
        if (!inviteDoc.exists || inviteDoc.data()?.userId !== user.id) {
            throw new Error(
                "Invitation not found or not intended for this user."
            );
        }
        const invitation = inviteDoc.data() as Invitation;
        if (invitation.status !== "pending") {
            throw new Error("This invitation is no longer active.");
        }

        const teamDocRef = teamRef.doc(invitation.teamId);

        // Add the user to the team as a 'member'
        const newMember: TeamMember = {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: "member",
        };

        transaction.update(teamDocRef, {
            members: FieldValue.arrayUnion(newMember),
            memberIds: FieldValue.arrayUnion(user.id),
        });

        // Mark the invitation as accepted
        transaction.update(inviteRef, {
            status: "accepted",
        });
    });
}

/**
 * Declines an invitation, setting its status to "declined".
 * @param invitationId - The ID of the invitation.
 * @param user - The authenticated user declining the invite.
 * @throws Will throw error if invitation is not found or not for this user.
 */
export async function declineInvitation(
    invitationId: string,
    user: AppUser
): Promise<void> {
    const inviteRef = dbAdmin.collection("invitations").doc(invitationId);
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists || inviteDoc.data()?.userId !== user.id) {
        throw new Error("Invitation not found or not intended for this user.");
    }

    const invitation = inviteDoc.data() as Invitation;
    if (invitation.status !== "pending") {
        throw new Error("This invitation is no longer active.");
    }

    // Just update the status to "declined"
    await inviteRef.update({
        status: "declined",
    });
}
