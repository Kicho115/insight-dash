"use client";

import { useState, useEffect } from "react";
import {
    onIdTokenChanged,
    User as FirebaseAuthUser,
    AuthError,
} from "firebase/auth";
import { auth, db } from "@/services/firebase/config";
import { onUserProfileChange } from "@/services/user";
import { AppUser, Invitation } from "@/types/user";
import {
    collection,
    query,
    where,
    onSnapshot,
    Unsubscribe,
} from "firebase/firestore";

interface AuthState {
    firebaseAuthUser: FirebaseAuthUser | null;
    user: AppUser | null;
    invitations: Invitation[];
    loading: boolean;
    error: AuthError | null;
}

/**
 * Custom hook for managing Firebase authentication state and user sessions.
 *
 * This hook provides:
 * - Real-time Firebase authentication state monitoring
 * - Session management with server-side cookies
 * - User profile data synchronization
 * - Authentication error handling
 * - Login/logout functionality
 *
 * The hook automatically:
 * - Creates session cookies when Firebase user is authenticated
 * - Sets up real-time listeners for user profile changes
 * - Cleans up listeners when component unmounts
 * - Handles authentication state transitions
 *
 * @returns An object containing authentication state and actions:
 * - `firebaseAuthUser`: Firebase Auth user object or null
 * - `user`: Application user profile data or null
 * - `loading`: Boolean indicating if auth state is being determined
 * - `error`: Any authentication error or null
 * - `login`: Function to create a session with ID token
 * - `logout`: Function to clear session and sign out
 * - `clearError`: Function to clear current error state
 *
 * @example
 * ```tsx
 * const { user, loading, error, login, logout } = useFirebaseAuth();
 *
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 * if (!user) return <LoginForm onLogin={login} />;
 *
 * return <Dashboard user={user} onLogout={logout} />;
 * ```
 */
export const useFirebaseAuth = (): AuthState => {
    const [firebaseAuthUser, setFirebaseAuthUser] =
        useState<FirebaseAuthUser | null>(null);
    const [user, setUser] = useState<AppUser | null>(null);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<AuthError | null>(null);

    useEffect(() => {
        let userProfileUnsubscribe: (() => void) | null = null;
        let invitationsUnsubscribe: Unsubscribe | null = null;

        const authUnsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
            setFirebaseAuthUser(firebaseUser);

            if (userProfileUnsubscribe) {
                userProfileUnsubscribe();
            }

            if (firebaseUser) {
                try {
                    const idToken = await firebaseUser.getIdToken();

                    // Create server session. The backend will handle creating the Firestore doc.
                    const response = await fetch("/api/sessionLogin", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ idToken }),
                    });

                    if (!response.ok) {
                        throw new Error("Failed to create session");
                    }

                    // Set up real-time listener for the user profile, which is now
                    // guaranteed to be created by the backend.
                    userProfileUnsubscribe = onUserProfileChange(
                        firebaseUser.uid,
                        (userData) => {
                            setUser(userData);
                            setLoading(false);
                        }
                    );

                    // Set up listener for pending invitations
                    const invitesQuery = query(
                        collection(db, "invitations"),
                        where("userId", "==", firebaseUser.uid),
                        where("status", "==", "pending")
                    );
                    invitationsUnsubscribe = onSnapshot(
                        invitesQuery,
                        (snapshot) => {
                            const invites: Invitation[] = [];
                            snapshot.forEach((doc) => {
                                invites.push({
                                    id: doc.id,
                                    ...doc.data(),
                                } as Invitation);
                            });
                            setInvitations(invites);
                        }
                    );
                } catch (err) {
                    setError(err as AuthError);
                    setLoading(false);
                }
            } else {
                // User is logged out
                setUser(null);
                setInvitations([]);
                setLoading(false);
            }
        });

        return () => {
            authUnsubscribe();
            if (userProfileUnsubscribe) userProfileUnsubscribe();
            if (invitationsUnsubscribe) invitationsUnsubscribe();
        };
    }, []);

    return { firebaseAuthUser, user, invitations, loading, error };
};
