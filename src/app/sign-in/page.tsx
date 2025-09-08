// app/sign-in/page.tsx
"use client";

// React and Next.js imports
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";

// Style imports
import styles from "./styles.module.css";
import { Modal } from "@/components/modal";
import { PasswordResetForm } from "@/components/passwordResetModal";

// Context and Firebase imports
import { useAuth } from "@/context/AuthProvider";
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
} from "@/services/firebase/auth";
import { AuthError } from "firebase/auth";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/services/firebase/config";

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

/**
 * Masks the email address for privacy in the confirmation modal.
 * Shows only the last 3 characters before "@" and the domain.
 */
const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (local.length <= 3) return "***@" + domain;
  return "*".repeat(local.length - 3) + local.slice(-3) + "@" + domain;
};

/**
 * @page SignInPage
 * @description A page for user sign-in and registration.
 */
export default function SignInPage() {
  // Page state
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form fields state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Controls visibility of the password reset request modal
  const [showResetModal, setShowResetModal] = useState(false);

  // Controls visibility of the confirmation modal after sending reset email
  const [showSentModal, setShowSentModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Auth context and router
  const { firebaseAuthUser, loading: authLoading } = useAuth();
  const router = useRouter();

  // Effect to handle redirection after successful authentication
  useEffect(() => {
    if (firebaseAuthUser && !authLoading) {
      // User is authenticated, redirect to home
      router.replace("/home");
    }
  }, [firebaseAuthUser, authLoading, router]);

  /**
   * @function handleSubmit
   * @description Handles the form submission for both sign-in and sign-up.
   */
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    let result;
    if (isSignUp) {
      result = await signUpWithEmail({ email, password, name });
    } else {
      result = await signInWithEmail(email, password);
    }

    if (result.error) {
      setError(getFirebaseAuthErrorMessage(result.error));
    }
    // On success, the useEffect hook will handle redirection.
    setIsLoading(false);
  };

  /**
   * @function handlePasswordReset
   * @description Sends password reset email using Firebase.
   * Shows confirmation modal on success.
   */
  const handlePasswordReset = async (resetEmailInput: string) => {
    try {
      await sendPasswordResetEmail(auth, resetEmailInput);
      setResetEmail(resetEmailInput);
      setShowResetModal(false);
      setShowSentModal(true);
    } catch (err) {
      setError("Error sending reset email. Try again.");
    }
  };

  /**
   * @function handleGoogleSignIn
   * @description Handles the Google Sign-In button click.
   */
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    const result = await signInWithGoogle();
    if (result.error) {
      setError(getFirebaseAuthErrorMessage(result.error));
    }
    setIsLoading(false);
  };

  // Render a loading state while checking auth status
  if (authLoading || firebaseAuthUser) {
    return <div className={styles.loadingContainer}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          {isSignUp ? "Create Your Account" : "Welcome Back"}
        </h1>
        <p className={styles.subtitle}>
          {isSignUp ? "Get started with Insight-Dash" : "Sign in to continue"}
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {isSignUp && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={styles.input}
              />
            </>
          )}
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.input}
          />

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className={styles.submitButton}
          >
            {isLoading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <div className={styles.dividerContainer}>
          <div className={styles.dividerLine}></div>
          <span className={styles.dividerText}>OR</span>
          <div className={styles.dividerLine}></div>
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
          Sign in with Google
        </button>

        {/* Show password recovery option */}
        {!isSignUp && (
          <button
            className={styles.forgotButton}
            onClick={() => setShowResetModal(true)}
          >
            ¿Forgot your password?
          </button>
        )}

        {/* Modal: Request password reset */}
        <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)}>
          <PasswordResetForm
            onSubmit={handlePasswordReset}
            onCancel={() => setShowResetModal(false)}
          />
        </Modal>

        {/* Modal: Confirmation after sending password reset email */}
        <Modal isOpen={showSentModal} onClose={() => setShowSentModal(false)}>
          <div>
            <h2>Email Sent</h2>
            <p>
              An email has been sent to <b>{resetEmail}</b> to reset your
              password.
            </p>
          </div>
        </Modal>

        <p className={styles.toggleText}>
          {isSignUp ? "Already have an account?" : "Don't have an account?"}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className={styles.toggleButton}
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}
