// Firebase imports
import {
  GoogleAuthProvider,
  signOut,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  type AuthError,
  type User as FirebaseAuthUser,
} from "firebase/auth";
import { auth } from "./config";

// Database imports
import { saveNewUserToFirestore } from "../user";

/**
 * @function signInWithGoogle
 * @description Initiates the Google Sign-In process.
 * @returns {Promise<{ user?: FirebaseAuthUser, error?: AuthError, credential?: any }>} An object containing the user, an error, or credentials.
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Save user to Firestore, if they are new
    await saveNewUserToFirestore(user);

    return { user };
  } catch (error: unknown) {
    const credential = GoogleAuthProvider.credentialFromError(
      error as AuthError
    );
    console.error("Error signing in with Google:", error);
    return { error: error as AuthError, credential };
  }
}

interface SignUpCredentials {
  email: string;
  password: string;
  name: string;
}

/**
 * @function signUpWithEmail
 * @description Registers a new user with their email, password, and additional details.
 * @param {SignUpCredentials} credentials - The user's registration details.
 * @returns {Promise<{ user?: FirebaseAuthUser, error?: AuthError }>} An object containing the new user or an error.
 */
export async function signUpWithEmail({
  email,
  password,
  name,
}: SignUpCredentials) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    // Update Firebase Auth profile with the user's name
    await updateProfile(user, { displayName: name });

    // Save the new user document to Firestore with extra details
    try {
      await saveNewUserToFirestore(user);
    } catch (firestoreError) {
      // Log the Firestore error but don't fail the entire signup process
      console.error("Failed to save user to Firestore:", firestoreError);
      // The auth user was created successfully, so we can still return the user
      // The user profile listener will handle creating the document later
    }

    return { user };
  } catch (error: unknown) {
    console.error("Error signing up:", error);
    return { error: error as AuthError };
  }
}

/**
 * @function signInWithEmail
 * @description Signs in an existing user with their email and password.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @returns {Promise<{ user?: FirebaseAuthUser, error?: AuthError }>} An object containing the user or an error.
 */
export async function signInWithEmail(email: string, password: string) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user };
  } catch (error: unknown) {
    console.error("Error signing in:", error);
    return { error: error as AuthError };
  }
}

/**
 * @function signOutUser
 * @description Signs out the currently authenticated user.
 * @returns {Promise<{ error: Error | null }>} An object containing an error if one occurred.
 */
export const signOutUser = async () => {
  let error: Error | null = null;
  try {
    await signOut(auth);
  } catch (e) {
    error = e as Error;
  }
  return { error };
};

/**
 * @function sendPasswordReset
 * @description Sends a password reset email to the given address.
 * @param {string} email - The user's email address.
 * @returns {Promise<{ success: boolean; error?: AuthError }>} An object indicating the outcome.
 */
export async function sendPasswordReset(
  email: string
): Promise<{ success: boolean; error?: AuthError }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: unknown) {
    console.error("Error sending password reset email:", error);
    return { success: false, error: error as AuthError };
  }
}
