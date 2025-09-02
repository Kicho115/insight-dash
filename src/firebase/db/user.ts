// Firebase imports
import { db } from "@/firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Import types
import { User as NewFirebaseUser } from "firebase/auth"; // User type
import { User } from "@/types/user";

export const saveNewUserToFirestore = async (user: NewFirebaseUser) => {
  try {
    const userRef = doc(db, "users", user.uid);

    const userSnap = await getDoc(userRef);

    // Map Firebase user to app user
    const appUser: User = {
      id: user.uid,
      email: user.email ?? "",
      displayName: user.displayName ?? "",
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
