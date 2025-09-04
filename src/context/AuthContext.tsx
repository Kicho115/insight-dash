"use client";

// React imports
import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";

// Firebase imports
import { onAuthStateChanged, User as FirebaseAuthUser } from "firebase/auth";
import { auth } from "@/firebase/config";

// DB imports
import { getUserFromFirestore, onUserProfileChange } from "@/firebase/db/user";

// Import types
import { User } from "@/types/user";

interface AuthContextType {
  firebaseAuthUser: FirebaseAuthUser | null;
  user: User | null;
  loading: boolean;
}

/**
 * @type {React.Context<AuthContextType>}
 * @description The React Context object for authentication state.
 * It holds the current user and loading status. It is consumed by the `useAuthContext` hook.
 */
export const AuthContext = createContext<AuthContextType>({
  firebaseAuthUser: null,
  user: null,
  loading: true,
});

/**
 * @hook
 * @description A custom hook to access the authentication context.
 * Provides the current Firebase user, user profile, and session loading state.
 * @returns An object containing:
 * - `firebaseAuthUser`: The Firebase user object if authenticated, or `null`.
 * - `user`: The complete user profile from Firestore, or `null`.
 * - `loading`: A boolean that is `true` while verifying the initial session.
 */
export const useAuthContext = () => useContext(AuthContext);

/**
 * @component
 * @description A component that provides the authentication context to its children.
 * It wraps the application and manages the user's session state by listening to Firebase Auth changes.
 * @param {{children: React.ReactNode}} props The component props.
 * @param {React.ReactNode} props.children The child components that will have access to the context.
 * @returns {JSX.Element} The provider component wrapping the children.
 */
export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseAuthUser, setFirebaseAuthUser] =
    useState<FirebaseAuthUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This will hold the unsubscribe function for the user profile listener
    let userProfileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setFirebaseAuthUser(firebaseUser);

      // Important: If a previous user profile listener is active, clean it up
      if (userProfileUnsubscribe) {
        userProfileUnsubscribe();
      }

      if (firebaseUser) {
        // User is logged in, set up the real-time listener for their profile
        userProfileUnsubscribe = onUserProfileChange(
          firebaseUser.uid,
          (userData) => {
            // This callback will be triggered whenever the user document changes
            setUser(userData);
            setLoading(false);
          }
        );
      } else {
        // User is logged out, clear user data
        setUser(null);
        setLoading(false);
      }
    });

    // Cleanup function for the effect
    return () => {
      authUnsubscribe(); // Unsubscribe from auth state changes
      if (userProfileUnsubscribe) {
        userProfileUnsubscribe(); // Unsubscribe from profile changes
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseAuthUser, user, loading }}>
      {loading ? <div>Loading...</div> : children}
    </AuthContext.Provider>
  );
};
