"use client";

// React imports
import { useState, useEffect } from "react";

// Firebase imports
import {
  onIdTokenChanged,
  User as FirebaseAuthUser,
  AuthError,
} from "firebase/auth";
import { auth } from "@/services/firebase/config";
import { onUserProfileChange } from "@/services/user";

// Types imports
import { AppUser } from "@/types/user";

interface AuthState {
  firebaseAuthUser: FirebaseAuthUser | null;
  user: AppUser | null;
  loading: boolean;
  error: AuthError | null;
}

interface AuthActions {
  login: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
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
export const useFirebaseAuth = (): AuthState & AuthActions => {
  const [firebaseAuthUser, setFirebaseAuthUser] =
    useState<FirebaseAuthUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  /**
   * Creates a server-side session using the provided Firebase ID token.
   *
   * @param idToken - The Firebase ID token to authenticate with
   * @throws Will set error state if session creation fails
   */
  const login = async (idToken: string) => {
    try {
      setError(null);
      const response = await fetch("/api/SessionLogin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }
    } catch (err) {
      setError(err as AuthError);
    }
  };

  /**
   * Signs out the user from both Firebase client and server session.
   * Clears the session cookie and Firebase authentication state.
   *
   * @throws Will set error state if logout fails
   */
  const logout = async () => {
    try {
      setError(null);
      await fetch("/api/sessionLogout", {
        method: "POST",
      });

      // Sign out from Firebase client as well
      await auth.signOut();
    } catch (err) {
      setError(err as AuthError);
    }
  };

  /**
   * Clears the current authentication error state.
   * Useful for dismissing error messages in the UI.
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Effect hook that manages Firebase authentication state changes and user profile synchronization.
   *
   * Sets up:
   * - Firebase auth state listener using onIdTokenChanged
   * - Real-time user profile listener when authenticated
   * - Automatic session creation for authenticated users
   * - Cleanup of all listeners on unmount
   *
   * The effect runs once on mount and handles all authentication state transitions.
   */
  useEffect(() => {
    let userProfileUnsubscribe: (() => void) | null = null;

    /**
     * Firebase auth state change handler.
     * Triggered whenever the user's ID token changes (login, logout, token refresh).
     *
     * @param firebaseUser - The current Firebase user or null
     */
    const authUnsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setFirebaseAuthUser(firebaseUser);

      // Clean up previous user profile listener
      if (userProfileUnsubscribe) {
        userProfileUnsubscribe();
      }

      if (firebaseUser) {
        try {
          // Get the ID token and create session cookie
          const idToken = await firebaseUser.getIdToken();

          // Create session without calling the login method to avoid recursion
          const response = await fetch("/api/sessionLogin", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ idToken }),
          });

          if (!response.ok) {
            throw new Error("Failed to create session");
          }

          // Set up real-time listener for user profile
          userProfileUnsubscribe = onUserProfileChange(
            firebaseUser.uid,
            async (userData) => {
              if (userData) {
                // User document exists
                setUser(userData);
              } else {
                // User document doesn't exist, try to create it as fallback
                try {
                  const { saveNewUserToFirestore } = await import(
                    "@/services/user"
                  );
                  await saveNewUserToFirestore(firebaseUser);
                  // Don't set user here, let the listener pick up the new document
                } catch (error) {
                  console.error(
                    "Failed to create fallback user document:",
                    error
                  );
                  // Set user to null to indicate no user data available
                  setUser(null);
                }
              }
              setLoading(false); // Always set loading to false, regardless of userData
            }
          );
        } catch (err) {
          setError(err as AuthError);
          setLoading(false);
        }
      } else {
        // User is logged out
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (userProfileUnsubscribe) {
        userProfileUnsubscribe();
      }
    };
  }, []);

  return {
    firebaseAuthUser,
    user,
    loading,
    error,
    login,
    logout,
    clearError,
  };
};
