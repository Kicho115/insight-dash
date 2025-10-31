import "server-only"; // Guarantees this code never runs on the client
import { dbAdmin } from "@/services/firebase/admin";
import { AppUser } from "@/types/user";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

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
            updatedAt: new Date(),
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
 * @returns {Promise<AppUser>} The user's profile data.
 * @throws Will throw an error if the user is not found.
 */
export async function getUserById(uid: string): Promise<AppUser> {
    const userDoc = await dbAdmin.collection("users").doc(uid).get();
    if (!userDoc.exists) {
        throw new Error("User not found.");
    }

    const data = userDoc.data();
    if (!data) {
        throw new Error("User data is empty."); // Should not happen if exists, but good check
    }

    // Defensively check if the timestamp exists and is a valid Timestamp object.
    // If not, provide a sensible fallback (like the current date).
    const createdAt =
        data.createdAt && data.createdAt instanceof Timestamp
            ? data.createdAt.toDate()
            : new Date(); // Fallback for missing createdAt

    const updatedAt =
        data.updatedAt && data.updatedAt instanceof Timestamp
            ? data.updatedAt.toDate()
            : createdAt; // Fallback to createdAt date (or new Date())

    return {
        ...(data as Omit<AppUser, "createdAt" | "updatedAt">),
        id: userDoc.id,
        createdAt,
        updatedAt,
    };
}

/**
 * Updates the display name for a given user.
 * @param uid - The user's unique ID.
 * @param newName - The new display name.
 * @throws Will throw an error if the name is invalid or the update fails.
 */
export async function updateUserName(
    uid: string,
    newName: string
): Promise<void> {
    if (!newName || newName.trim().length === 0) {
        throw new Error("Name cannot be empty.");
    }

    const userRef = dbAdmin.collection("users").doc(uid);
    await userRef.update({
        name: newName.trim(),
        updatedAt: FieldValue.serverTimestamp(),
    });
}
