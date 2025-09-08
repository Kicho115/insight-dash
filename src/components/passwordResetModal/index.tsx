"use client";

import { useState } from "react";
import styles from "./styles.module.css";

interface PasswordResetFormProps {
  onSubmit: (email: string) => Promise<void>;
  onCancel: () => void;
}

export const PasswordResetForm = ({
  onSubmit,
  onCancel,
}: PasswordResetFormProps) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onSubmit(email);
    } catch {
      setError("Error sending reset email. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Forgot your password?</h2>
      <p className={styles.description}>
        Enter your email to receive a reset link.
      </p>
      <input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={styles.input}
        autoFocus
      />
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button
          className={styles.primaryButton}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
        <button className={styles.secondaryButton} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};
