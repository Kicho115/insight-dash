// app/sign-in/page.tsx
"use client";

// React and Next.js imports
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";

// Style imports
import styles from "./styles.module.css";

// Component imports
import { Modal } from "@/components/modal";
import { PasswordResetModal } from "@/components/passwordResetModal";
import { LoadingSpinner } from "@/components/loading";

// Context and Firebase imports
import { useAuth } from "@/context/AuthProvider"; // Corrected hook name
import {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
} from "@/services/firebase/auth";
import { AuthError, User as FirebaseAuthUser } from "firebase/auth";

/**
 * @function getFirebaseAuthErrorMessage
 * @description Converts a Firebase Auth error code into a user-friendly string.
 * @param {AuthError} error - The error object from Firebase Auth.
 * @returns {string} A user-friendly error message.
 */
const getFirebaseAuthErrorMessage = (error: AuthError): string => {
    switch (error.code) {
        case "auth/email-already-in-use":
            return "This email is already registered. Please sign in.";
        case "auth/invalid-email":
            return "Please enter a valid email address.";
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
            return "Invalid email or password. Please try again.";
        case "auth/weak-password":
            return "Password should be at least 6 characters long.";
        default:
            return "An unexpected error occurred. Please try again.";
    }
};

type AuthActionResult = {
    user?: FirebaseAuthUser;
    error?: AuthError;
    cancelled?: boolean;
};

/**
 * @page SignInPage
 * @description A page for user sign-in and registration.
 */
export default function SignInPage() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [showResetModal, setShowResetModal] = useState(false);

    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    // This effect applies a temporary workaround for a known Firebase issue
    // where closing the Google Sign-In popup takes 8 seconds to be detected.
    useEffect(() => {
        // Save the original setTimeout function
        const originalSetTimeout = window.setTimeout;

        // Override the global setTimeout
        const customSetTimeout = function (
            fn: TimerHandler,
            delay?: number,
            ...args: unknown[]
        ): number {
            if (delay === 8000) {
                delay = 1000;
            }
            // Call the original setTimeout with the (potentially modified) delay
            return originalSetTimeout(fn, delay, ...args);
        };

        customSetTimeout.__promisify__ = originalSetTimeout.__promisify__;
        window.setTimeout = customSetTimeout as typeof window.setTimeout;

        // Restore the original setTimeout to prevent side effects in other parts of the app.
        return () => {
            window.setTimeout = originalSetTimeout;
        };
    }, []); // Run this effect only once when the component mounts

    // If a logged-in user tries to navigate here, send them away.
    useEffect(() => {
        if (!authLoading && user) {
            router.replace("/home");
        }
    }, [user, authLoading, router]);

    const handleAuthAction = async (
        action: () => Promise<AuthActionResult>
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await action();

            if (result.cancelled) {
                setIsLoading(false); // Just stop loading, no error message is needed.
                return;
            }

            if (result.error) {
                setError(getFirebaseAuthErrorMessage(result.error));
                setIsLoading(false); // Stop loading only on error
            }
        } catch (err) {
            console.error(
                "An unexpected error occurred during auth action:",
                err
            );
            setError("An unexpected error occurred. Please try again.");
            setIsLoading(false);
        }
    };

    /**
     * @function handleSubmit
     * @description Handles the form submission for both sign-in and sign-up.
     */
    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (isSignUp) {
            handleAuthAction(() => signUpWithEmail({ email, password, name }));
        } else {
            handleAuthAction(() => signInWithEmail(email, password));
        }
    };

    /**
     * @function handleGoogleSignIn
     * @description Handles the Google Sign-In button click.
     */
    const handleGoogleSignIn = () => {
        handleAuthAction(signInWithGoogle);
    };

    // Render a loading state while checking auth status
    if (authLoading || user) {
        return (
            <LoadingSpinner fullScreen text="Authenticating..." size="medium" />
        );
    }

    return (
        <div className={styles.container}>
            {/* Loading overlay for authentication processes */}
            {isLoading && (
                <div className={styles.loadingOverlay}>
                    <LoadingSpinner
                        fullScreen
                        text={
                            isSignUp ? "Creating account..." : "Signing in..."
                        }
                        size="medium"
                    />
                </div>
            )}

            <div className={styles.card}>
                <h1 className={styles.title}>
                    {isSignUp ? "Create Your Account" : "Welcome Back"}
                </h1>
                <p className={styles.subtitle}>
                    {isSignUp
                        ? "Get started with Insight-Dash"
                        : "Sign in to continue"}
                </p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {isSignUp && (
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className={styles.input}
                            disabled={isLoading}
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className={styles.input}
                        disabled={isLoading}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className={styles.input}
                        disabled={isLoading}
                    />

                    {error && <p className={styles.error}>{error}</p>}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={styles.submitButton}
                    >
                        {isLoading
                            ? "Processing..."
                            : isSignUp
                            ? "Sign Up"
                            : "Sign In"}
                    </button>
                </form>

                {!isSignUp && (
                    <div className={styles.forgotPasswordContainer}>
                        <button
                            className={styles.forgotButton}
                            onClick={() => setShowResetModal(true)}
                            disabled={isLoading}
                        >
                            Forgot your password?
                        </button>
                    </div>
                )}

                <div className={styles.dividerContainer}>
                    <div className={styles.dividerLine} />
                    <span className={styles.dividerText}>OR</span>
                    <div className={styles.dividerLine} />
                </div>

                <button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className={styles.googleButton}
                >
                    <svg className={styles.googleIcon} viewBox="0 0 48 48">
                        <path
                            fill="#EA4335"
                            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        ></path>
                        <path
                            fill="#4285F4"
                            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.53-4.18 7.13-10.12 7.13-17.65z"
                        ></path>
                        <path
                            fill="#FBBC05"
                            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        ></path>
                        <path
                            fill="#34A853"
                            d="M24 48c6.48 0 11.93-2.13 15.89-5.82l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        ></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                    {isLoading ? "Authenticating..." : "Sign in with Google"}
                </button>

                <p className={styles.toggleText}>
                    {isSignUp
                        ? "Already have an account?"
                        : "Don't have an account?"}
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError(null);
                        }}
                        className={styles.toggleButton}
                        disabled={isLoading}
                    >
                        {isSignUp ? "Sign In" : "Sign Up"}
                    </button>
                </p>
            </div>

            <Modal
                isOpen={showResetModal}
                onClose={() => setShowResetModal(false)}
            >
                <PasswordResetModal
                    onClose={() => setShowResetModal(false)}
                    initialEmail={email}
                />
            </Modal>
        </div>
    );
}
