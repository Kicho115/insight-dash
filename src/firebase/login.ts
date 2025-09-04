// login.ts
import {
  GoogleAuthProvider,
  signOut,
  signInWithPopup,
  type AuthError,
} from "firebase/auth";
import { auth } from "./config";
import { saveNewUserToFirestore } from "./db/user";

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    await saveNewUserToFirestore(user);

    return { user };
  } catch (error: unknown) {
    const credential = GoogleAuthProvider.credentialFromError(
      error as AuthError
    );
    console.error("Error signing in:", error);
    return { error, credential };
  }
}

/**
 * @function signOutUser
 * @description Signs out the currently authenticated user.
 * @returns {Promise<{ error: Error | null }>} An object containing an error if one occurred during the process.
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
