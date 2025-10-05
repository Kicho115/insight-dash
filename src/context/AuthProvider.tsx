"use client";

import { createContext, useContext, ReactNode } from "react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

// Infer the types from the hook's return value for consistency
type AuthContextType = ReturnType<typeof useFirebaseAuth>;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * @hook useAuth
 * @description The primary hook to access authentication state throughout the app.
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

/**
 * @component AuthProvider
 * @description Wraps the application and provides authentication state via the useFirebaseAuth hook.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const auth = useFirebaseAuth();

    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};
