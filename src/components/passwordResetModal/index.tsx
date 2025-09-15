"use client";

import { useState, FormEvent } from "react";
import styles from "./styles.module.css";
import { sendPasswordReset } from "@/services/firebase/auth";
import { checkEmailExists } from "@/services/user";
import { AuthError } from "firebase/auth";

// Import an icon for the success message
import { IoCheckmarkCircle } from "react-icons/io5";

/**
 * @interface PasswordResetModalProps
 * @description Defines the props for the PasswordResetModal component.
 */
interface PasswordResetModalProps {
  onClose: () => void;
  initialEmail?: string; // Pre-fill email from the sign-in form
}

/**
 * @function getFirebaseAuthErrorMessage
 * @description A simplified error handler for password reset.
 */
const getFirebaseAuthErrorMessage = (error: AuthError): string => {
  switch (error.code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-not-found":
      return "No account found with this email.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
};

/**
 * @component PasswordResetModal
 * @description A self-contained modal for handling the password reset flow.
 */
export const PasswordResetModal = ({
  onClose,
  initialEmail = "",
}: PasswordResetModalProps) => {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false); // New state to track success

  /**
   * @function handleSubmit
   * @description Handles the form submission to send the reset email.
   * Includes a check to see if the email exists first.
   */
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setIsLoading(true);
    setError(null);

    // Step 1: Securely check if the email is registered
    const emailRegistered = await checkEmailExists(email);

    if (!emailRegistered) {
      setError("This email is not registered with an account.");
      setIsLoading(false);
      return;
    }

    // Step 2: If it exists, proceed to send the reset email
    const result = await sendPasswordReset(email);

    setIsLoading(false);

    if (result.success) {
      setIsSent(true); // On success, switch to the confirmation view
    } else if (result.error) {
      setError(getFirebaseAuthErrorMessage(result.error));
    }
  };

  // Mask email for privacy
  const maskEmail = (email: string) => {
    const [local, domain] = email.split("@");
    if (!domain) return email;
    const maskedLocal =
      local.length > 3
        ? `${local.substring(0, 2)}***`
        : `${local.substring(0, 1)}***`;
    return `${maskedLocal}@${domain}`;
  };

  return (
    <div className={styles.container}>
      {isSent ? (
        // --- Success View ---
        <div className={styles.successContainer}>
          <IoCheckmarkCircle className={styles.successIcon} />
          <h2 className={styles.title}>Check your inbox</h2>
          <p className={styles.description}>
            A password reset link has been sent to <b>{maskEmail(email)}</b>.
            Please follow the instructions in the email to reset your password.
          </p>
          <button className={styles.primaryButton} onClick={onClose}>
            Close
          </button>
        </div>
      ) : (
        // --- Form View ---
        <>
          <h2 className={styles.title}>Forgot Your Password?</h2>
          <p className={styles.description}>
            No problem. Enter the email address associated with your account,
            and we&apos;ll send you a link to reset your password.
          </p>
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              required
              autoFocus
            />
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};
