"use client";

import { useState, FormEvent } from "react";
import styles from "./styles.module.css";
import { Modal } from "@/components/modal";
import { IoMailOutline } from "react-icons/io5";

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInvite: (email: string) => Promise<void>;
    isLoading: boolean;
    error: string | null; // Error message from the parent
}

export const InviteMemberModal = ({
    isOpen,
    onClose,
    onInvite,
    isLoading,
    error,
}: InviteMemberModalProps) => {
    const [email, setEmail] = useState("");
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);
        if (!email.trim() || !email.includes("@")) {
            setLocalError("Please enter a valid email address.");
            return;
        }

        try {
            await onInvite(email.trim());
            // On success, the parent component (TeamDetailsClient) will close the modal.
            // We only reset the email field here.
            setEmail("");
        } catch (err) {
            console.error("Error sending invitation:", err);
        }
    };

    // Use the error from the parent (API) if it exists, otherwise show local validation error
    const displayError = error || localError;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit} className={styles.container}>
                <div className={styles.iconWrapper}>
                    <IoMailOutline className={styles.icon} />
                </div>
                <h2 className={styles.title}>Invite New Member</h2>
                <p className={styles.subtitle}>
                    Enter the email address of the user you want to add to this
                    team.
                </p>
                <div className={styles.inputGroup}>
                    <label htmlFor="email" className={styles.label}>
                        User&apos;s Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.input}
                        placeholder="teammate@example.com"
                        required
                        autoFocus
                        disabled={isLoading}
                    />
                    {displayError && (
                        <p className={styles.error}>{displayError}</p>
                    )}
                </div>
                <div className={styles.actions}>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`${styles.button} ${styles.cancelButton}`}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={`${styles.button} ${styles.confirmButton}`}
                        disabled={isLoading || !email.trim()}
                    >
                        {isLoading ? "Sending Invite..." : "Send Invite"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
