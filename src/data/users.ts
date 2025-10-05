import "server-only"; // Guarantees this code never runs on the client
import { dbAdmin } from "@/services/firebase/admin";
import { AppUser } from "@/types/user";

/**
 * Creates or updates a user document in Firestore using the Admin SDK.
 * @param uid - The user's unique ID.
 * @param userData - The basic user data (email, name).
 */
export async function createOrUpdateUser(
    uid: string,
    userData: { email: string; name: string }
): Promise<void> {
    const userRef = dbAdmin.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
        const newUser: Partial<AppUser> = {
            id: uid,
            email: userData.email,
            name: userData.name,
            createdAt: new Date(),
            teams: [],
            position: "",
        };
        await userRef.set(newUser, { merge: true });
    }
}

/**
 * Checks if a user exists by their email address.
 * @param email - The email to check.
 * @returns {Promise<boolean>} True if a user with that email exists.
 */
export async function doesEmailExist(email: string): Promise<boolean> {
    if (!email) return false;
    const usersRef = dbAdmin.collection("users");
    const snapshot = await usersRef.where("email", "==", email).limit(1).get();
    return !snapshot.empty;
}

/**
 * Fetches a user profile by their UID from the server side.
 * @param uid - The user's unique ID.
 * @returns {Promise<AppUser | null>} The user's profile data.
 */
export async function getUserById(uid: string): Promise<AppUser | null> {
    const userDoc = await dbAdmin.collection("users").doc(uid).get();
    if (!userDoc.exists) {
        return null;
    }
    return userDoc.data() as AppUser;
}
