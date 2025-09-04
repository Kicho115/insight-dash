// Firebase imports
import { db } from "@/firebase/config";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

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

/**
 * @function onUserProfileChange
 * @description Listens for real-time changes to a user's profile document in Firestore.
 * @param {string} uid - The user's unique ID.
 * @param {(user: User | null) => void} callback - The function to call with the user data when it changes.
 * @returns {import("firebase/firestore").Unsubscribe} A function to unsubscribe from the listener.
 */
export const onUserProfileChange = (
  uid: string,
  callback: (user: User | null) => void
) => {
  const userDocRef = doc(db, "users", uid);
  // Returns the unsubscribe function
  return onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      // Document exists, pass the data to the callback
      callback({ id: docSnap.id, ...docSnap.data() } as User);
    } else {
      // Document does not exist (yet)
      callback(null);
    }
  });
};
