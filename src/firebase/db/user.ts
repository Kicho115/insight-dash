// Firebase imports
import { db } from "@/firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Import types
import { User as NewFirebaseUser } from "firebase/auth"; // User type
import { User } from "@/types/user";

/**
 * @function
 * @description Save a new user document to Firestore.
 * @param {NewFirebaseUser} user The Firebase user object to save.
 * @returns {Promise<void>} A promise that resolves when the user is saved.
 */
export const saveNewUserToFirestore = async (user: NewFirebaseUser) => {
  try {
    const userRef = doc(db, "users", user.uid);

    const userSnap = await getDoc(userRef);

    // Map Firebase user to app user
    const appUser: User = {
      id: user.uid,
      email: user.email ?? "",
      name: user.displayName ?? "",
      createdAt: new Date(),
      teams: [],
      position: "",
    };

    // Check if the user is new
    if (!userSnap.exists()) {
      await setDoc(userRef, appUser);
    }
  } catch (error) {
    console.error("Error saving new user to Firestore:", error);
  }
};

/**
 * @function
 * @description Fetch a user document from Firestore by UID.
 * @param {string} uid The UID of the user to fetch.
 * @returns {Promise<User | null>} A promise that resolves to the user data or null if not found.
 */
export const getUserFromFirestore = async (
  uid: string
): Promise<User | null> => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data() as User;
    }
  } catch (error) {
    console.error("Error fetching user from Firestore:", error);
  }
  return null;
};
