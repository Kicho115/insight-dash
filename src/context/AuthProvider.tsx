"use client";

// React imports
import { createContext, useContext, ReactNode } from "react";

// Firebase imports
import { User as FirebaseAuthUser, AuthError } from "firebase/auth";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

// Component imports
import { LoadingSpinner } from "@/components/loading";

// Type imports
import { AppUser } from "@/types/user";

interface AuthContextType {
    firebaseAuthUser: FirebaseAuthUser | null;
    user: AppUser | null;
    loading: boolean;
    error: AuthError | null;
    login: (idToken: string) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * @hook
 * @description Custom hook to access the authentication context
 * @returns {AuthContextType} The authentication context
 * @throws Will throw an error if used outside of AuthProvider
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

/**
 * @component
 * @description Authentication provider that manages user state and provides auth methods
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components
 * @returns {JSX.Element} The provider component
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const authState = useFirebaseAuth();

    return (
        <AuthContext.Provider value={authState}>
            {authState.loading ? (
                <LoadingSpinner
                    fullScreen
                    text="Initializing your session..."
                    size="large"
                />
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
