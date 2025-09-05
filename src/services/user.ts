// Firebase imports
import { db } from "@/services/firebase/config";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

// Import types
import { User as FirebaseAuthUser } from "firebase/auth";
import { AppUser } from "@/types/user";

/**
 * @function
 * @description Save a new user document to Firestore.
 * @param {FirebaseAuthUser} user The Firebase user object to save.
 * @returns {Promise<void>} A promise that resolves when the user is saved.
 */
export const saveNewUserToFirestore = async (user: FirebaseAuthUser) => {
  try {
    const userRef = doc(db, "users", user.uid);

    const userSnap = await getDoc(userRef);

    // Map Firebase user to app user
    const appUser: Partial<AppUser> = {
      id: user.uid,
      email: user.email ?? "",
      name: user.displayName ?? "",
      createdAt: new Date(),
      teams: [],
      position: "",
    };

    // Check if the user is new
    if (!userSnap.exists()) {
      // Use merge: true to only set provided fields and avoid overwriting existing data
      await setDoc(userRef, appUser, { merge: true });
    }
  } catch (error) {
    console.error("Error saving new user to Firestore:", error);
    // Re-throw the error to let the calling function handle it
    throw error;
  }
};

/**
 * @function
 * @description Update user document in Firestore with partial data.
 * @param {string} uid The UID of the user to update.
 * @param {Partial<AppUser>} userData Partial user data to update.
 * @returns {Promise<void>} A promise that resolves when the user is updated.
 */
export const updateUserInFirestore = async (
  uid: string,
  userData: Partial<AppUser>
): Promise<void> => {
  try {
    const userRef = doc(db, "users", uid);

    // Always use merge: true to avoid overwriting unspecified fields
    await setDoc(userRef, userData, { merge: true });
  } catch (error) {
    console.error("Error updating user in Firestore:", error);
    throw error;
  }
};

/**
 * @function
 * @description Fetch a user document from Firestore by UID.
 * @param {string} uid The UID of the user to fetch.
 * @returns {Promise<AppUser | null>} A promise that resolves to the user data or null if not found.
 */
export const getUserFromFirestore = async (
  uid: string
): Promise<AppUser | null> => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data() as AppUser;
    }
  } catch (error) {
    console.error("Error fetching user from Firestore:", error);
  }
  return null;
};

/**
 * @function onUserProfileChange
 * @description Listens for real-time changes to a user's profile document in Firestore.
 * Use this for dynamic data that changes frequently.
 * @param {string} uid - The user's unique ID.
 * @param {(user: AppUser | null) => void} callback - The function to call with the user data when it changes.
 * @returns {import("firebase/firestore").Unsubscribe} A function to unsubscribe from the listener.
 */
export const onUserProfileChange = (
  uid: string,
  callback: (user: AppUser | null) => void
) => {
  const userDocRef = doc(db, "users", uid);
  // Returns the unsubscribe function
  return onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      // Document exists, pass the data to the callback
      callback({ id: docSnap.id, ...docSnap.data() } as AppUser);
    } else {
      // Document does not exist (yet)
      callback(null);
    }
  });
};

/**
 * @function getUserProfileOnce
 * @description Get user profile data once without real-time listening.
 * Use this for static data that doesn't change often to reduce reads and costs.
 * @param {string} uid - The user's unique ID.
 * @returns {Promise<AppUser | null>} The user data or null if not found.
 */
export const getUserProfileOnce = async (
  uid: string
): Promise<AppUser | null> => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as AppUser;
    }

    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

/**
 * @function
 * @description Get all users from a list of user IDs.
 * @param {string[]} userIds Array of user IDs to fetch.
 * @returns {Promise<AppUser[]>} Array of users found.
 */
export const getUsersByIds = async (userIds: string[]): Promise<AppUser[]> => {
  try {
    const users: AppUser[] = [];

    // Fetch users in parallel
    const userPromises = userIds.map(async (uid) => {
      const user = await getUserProfileOnce(uid);
      return user;
    });

    const results = await Promise.all(userPromises);

    // Filter out null results
    results.forEach((user: AppUser | null) => {
      if (user) {
        users.push(user);
      }
    });

    return users;
  } catch (error) {
    console.error("Error fetching users by IDs:", error);
    return [];
  }
};
