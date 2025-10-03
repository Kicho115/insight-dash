// Firebase imports
import {
    GoogleAuthProvider,
    signOut,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail as firebaseSendPasswordResetEmail,
    type AuthError,
} from "firebase/auth";
import { auth } from "./config";

/**
 * Creates a server-side session by sending the ID token to our API route.
 * @param {string} idToken - The Firebase ID token of the authenticated user.
 * @returns {Promise<{success: boolean}>}
 */
async function createServerSession(idToken: string) {
    const response = await fetch("/api/sessionLogin", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
    });

    return response.json();
}

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
        const idToken = await result.user.getIdToken();

        // Create the server session after successful client-side login
        await createServerSession(idToken);

        return { user: result.user };
    } catch (error: unknown) {
        return { error: error as AuthError };
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
export async function signUpWithEmail({ email, password, name }: any) {
    try {
        const result = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );
        await updateProfile(result.user, { displayName: name });
        const idToken = await result.user.getIdToken();

        // Create the server session
        await createServerSession(idToken);

        return { user: result.user };
    } catch (error: unknown) {
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
        const idToken = await result.user.getIdToken();

        // Create the server session
        await createServerSession(idToken);

        return { user: result.user };
    } catch (error: unknown) {
        return { error: error as AuthError };
    }
}

/**
 * @function signOutUser
 * @description Signs out the currently authenticated user.
 * @returns {Promise<{ error: Error | null }>} An object containing an error if one occurred.
 */
export const signOutUser = async () => {
    try {
        // Sign out from Firebase client
        await signOut(auth);
        // Sign out from Next.js server session
        await fetch("/api/sessionLogout", { method: "POST" });
        return { success: true };
    } catch (error: unknown) {
        return { error: error as Error };
    }
};

/**
 * @function sendPasswordReset
 * @description Sends a password reset email to the given address.
 * @param {string} email - The user's email address.
 * @returns {Promise<{ success: boolean; error?: AuthError }>} An object indicating the outcome.
 */
export async function sendPasswordReset(email: string) {
    try {
        await firebaseSendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error: unknown) {
        return { error: error as AuthError };
    }
}
