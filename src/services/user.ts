// Firebase imports for client-side operations
import { db } from "@/services/firebase/config";
import { doc, onSnapshot } from "firebase/firestore";

// Import types
import { AppUser } from "@/types/user";

/**
 * @function onUserProfileChange
 * @description (Client-Side) Listens for real-time changes to a user's profile.
 * This MUST use the client SDK to provide real-time updates to the UI.
 * @param {string} uid - The user's unique ID.
 * @param {(user: AppUser | null) => void} callback - Function to call with user data.
 * @returns {import("firebase/firestore").Unsubscribe} A function to unsubscribe.
 */
export const onUserProfileChange = (
    uid: string,
    callback: (user: AppUser | null) => void
) => {
    const userDocRef = doc(db, "users", uid);
    return onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() } as AppUser);
        } else {
            callback(null);
        }
    });
};

/**
 * @function checkEmailExists
 * @description (Client-Side) Calls the secure API route to check if an email exists.
 * @param {string} email - The email address to check.
 * @returns {Promise<boolean>} True if the email exists.
 */
export const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
        const response = await fetch("/api/users/check-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            console.error("API error checking email:", response.statusText);
            return false;
        }

        const data = await response.json();
        return data.exists === true;
    } catch (error) {
        console.error("Network error checking email:", error);
        return false;
    }
};
