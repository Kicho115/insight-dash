// login.ts
/**
 * @file This file contains all Firebase Authentication-related functions.
 */

// Firebase imports
import {
  GoogleAuthProvider,
  signOut,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  type AuthError,
  type User as FirebaseAuthUser,
} from "firebase/auth";
import { auth } from "./config";

// Database imports
import { saveNewUserToFirestore } from "./db/user";

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

/**
 * @typedef {Object} SignUpCredentials
 * @property {string} email - The user's email address.
 * @property {string} password - The user's chosen password.
 * @property {string} name - The user's full name.
 * @property {string} team - The user's team name.
 */

/**
 * TypeScript interface for sign-up credentials.
 */
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
    await saveNewUserToFirestore(user);

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
