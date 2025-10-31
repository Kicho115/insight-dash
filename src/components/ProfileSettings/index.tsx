"use client";

import { useState, FormEvent } from "react";
import { AppUser } from "@/types/user";
import styles from "./styles.module.css";
import { IoCheckmarkCircle, IoWarning } from "react-icons/io5";

interface ProfileSettingsProps {
    user: AppUser;
}

export const ProfileSettings = ({ user }: ProfileSettingsProps) => {
    const [name, setName] = useState(user.name);
    const [email] = useState(user.email); // Email is read-only
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (name === user.name) {
            setError("You haven't changed your name.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/users/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to update profile.");
            }

            setSuccess("Your name has been updated successfully!");
            // The onUserProfileChange listener in useFirebaseAuth
            // will automatically update the global user state (e.g., in the sidebar).
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.card}>
            <form onSubmit={handleSubmit}>
                <div className={styles.fieldGroup}>
                    <label htmlFor="name" className={styles.label}>
                        Full Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={styles.input}
                        disabled={isLoading}
                    />
                </div>

                <div className={styles.fieldGroup}>
                    <label htmlFor="email" className={styles.label}>
                        Email Address
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        className={styles.input}
                        disabled // Email is not editable
                    />
                </div>

                <footer className={styles.footer}>
                    <div className={styles.messageWrapper}>
                        {error && (
                            <p className={`${styles.message} ${styles.error}`}>
                                <IoWarning /> {error}
                            </p>
                        )}
                        {success && (
                            <p
                                className={`${styles.message} ${styles.success}`}
                            >
                                <IoCheckmarkCircle /> {success}
                            </p>
                        )}
                    </div>
                    <button
                        type="submit"
                        className={styles.saveButton}
                        disabled={isLoading || name === user.name}
                    >
                        {isLoading ? "Saving..." : "Save Changes"}
                    </button>
                </footer>
            </form>
        </div>
    );
};
