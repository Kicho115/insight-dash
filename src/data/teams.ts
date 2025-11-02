import "server-only";
import { dbAdmin } from "@/services/firebase/admin";
import { Team, TeamMemberRole, AppUser, TeamMember } from "@/types/user";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Creates a new team and sets the creator as the 'owner'.
 * Initializes both the 'members' and 'memberIds' arrays.
 * @param teamName - The name for the new team.
 * @param creator - The AppUser object of the user creating the team.
 * @returns {Promise<Team>} The newly created team document.
 */
export async function createTeam(
    teamName: string,
    creator: AppUser
): Promise<Team> {
    if (!teamName || teamName.trim().length === 0) {
        throw new Error("Team name cannot be empty.");
    }

    const newTeamRef = dbAdmin.collection("teams").doc();
    const creatorMember: TeamMember = {
        userId: creator.id,
        email: creator.email,
        name: creator.name,
        role: "owner",
    };

    const newTeam: Team = {
        id: newTeamRef.id,
        name: teamName.trim(),
        members: [creatorMember], // Full details array
        memberIds: [creator.id], // Denormalized simple array
        createdAt: new Date(), // Will be replaced by serverTimestamp
    };

    await newTeamRef.set({
        ...newTeam,
        createdAt: FieldValue.serverTimestamp(),
    });

    return newTeam;
}

/**
 * Fetches all teams that a user is a member of.
 * Uses the highly efficient denormalized 'memberIds' array.
 * @param userId - The UID of the user.
 * @returns {Promise<Team[]>} A list of teams the user belongs to.
 */
export async function getTeamsForUser(userId: string): Promise<Team[]> {
    const teamsRef = dbAdmin.collection("teams");

    // This query is fast, simple, and requires no composite index
    const snapshot = await teamsRef
        .where("memberIds", "array-contains", userId)
        .get();

    if (snapshot.empty) {
        return [];
    }

    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt.toDate(),
        } as Team;
    });
}

/**
 * Adds a new member to a team, updating both 'members' and 'memberIds' arrays.
 * @param teamId - The ID of the team to update.
 * @param newUser - The AppUser object of the new member.
 * @param role - The role to assign to the new member.
 */
export async function addMemberToTeam(
    teamId: string,
    newUser: AppUser,
    role: TeamMemberRole
): Promise<void> {
    if (role === "owner") {
        throw new Error(
            "Cannot assign 'owner' role. Only one owner is allowed."
        );
    }

    const teamRef = dbAdmin.collection("teams").doc(teamId);
    const newMember: TeamMember = {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: role,
    };

    // Atomically add the new member to both arrays
    await teamRef.update({
        members: FieldValue.arrayUnion(newMember),
        memberIds: FieldValue.arrayUnion(newUser.id),
    });
}

/**
 * Removes a member from a team, updating both 'members' and 'memberIds' arrays.
 * @param teamId - The ID of the team to update.
 * @param memberToRemove - The full TeamMember object to remove.
 */
export async function removeMemberFromTeam(
    teamId: string,
    memberToRemove: TeamMember
): Promise<void> {
    if (memberToRemove.role === "owner") {
        throw new Error("Cannot remove the team owner.");
    }

    const teamRef = dbAdmin.collection("teams").doc(teamId);

    // Atomically remove the member from both arrays
    await teamRef.update({
        members: FieldValue.arrayRemove(memberToRemove),
        memberIds: FieldValue.arrayRemove(memberToRemove.userId),
    });
}

/**
 * Fetches a single team by its ID and verifies the user is a member.
 * @param teamId - The ID of the team to fetch.
 * @param userId - The UID of the user making the request.
 * @returns {Promise<Team>} The team data.
 * @throws Will throw an error if the team is not found or the user is not a member.
 */
export async function getTeamById(
    teamId: string,
    userId: string
): Promise<Team> {
    const teamDocRef = dbAdmin.collection("teams").doc(teamId);
    const teamDoc = await teamDocRef.get();

    if (!teamDoc.exists) {
        throw new Error("Team not found.");
    }

    const teamData = teamDoc.data() as Team;

    // Security Check: Verify the user is in the denormalized memberIds array.
    if (!teamData.memberIds || !teamData.memberIds.includes(userId)) {
        throw new Error("Access denied. You are not a member of this team.");
    }

    return {
        ...teamData,
        id: teamDoc.id,
        createdAt: teamData.createdAt,
    };
}
