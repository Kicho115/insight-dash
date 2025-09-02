"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/config";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

/**
 * @type {React.Context<AuthContextType>}
 * @description The React Context object for authentication state.
 * It holds the current user and loading status. It is consumed by the `useAuthContext` hook.
 */
export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

/**
 * @hook
 * @description A custom hook to access the authentication context.
 * Provides the current user and session loading state.
 * @returns An object containing:
 * - `user`: The Firebase user object if the session is active, or `null`.
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {loading ? <div>Loading...</div> : children}
    </AuthContext.Provider>
  );
};
