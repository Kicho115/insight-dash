"use client";

import { useState, useEffect } from "react";
import styles from "./styles.module.css";
import { Modal } from "@/components/modal";
import { useTeams } from "@/context/TeamsProvider"; // Hook to get user's teams
import { File as FileMetadata } from "@/types/file";
import {
    IoLockClosed,
    IoGlobe,
    IoPeople,
    IoShareSocialOutline,
} from "react-icons/io5";

interface VisibilityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newVisibility: string) => Promise<void>;
    file: FileMetadata | null;
    isSaving: boolean;
}

export const VisibilityModal = ({
    isOpen,
    onClose,
    onSave,
    file,
    isSaving,
}: VisibilityModalProps) => {
    const { teams, isLoading: isLoadingTeams } = useTeams();
    const [currentVisibility, setCurrentVisibility] = useState("private");
    const [error, setError] = useState<string | null>(null);

    // Determine the file's current visibility setting *only when the modal opens*.
    useEffect(() => {
        // This condition ensures this logic only runs when the modal
        // is opened, not on every background data refresh.
        if (isOpen && file) {
            if (file.isPublic) {
                setCurrentVisibility("public");
            } else if (file.teamIds && file.teamIds.length > 0) {
                setCurrentVisibility(file.teamIds[0]); // Default to the first team
            } else {
                setCurrentVisibility("private");
            }
        }
        // We only want this effect to re-run when the 'isOpen' or 'file' prop changes.
    }, [isOpen, file]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await onSave(currentVisibility);
            onClose(); // Close modal on success
        } catch (err) {
            setError((err as Error).message);
        }
    };

    if (!file) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit} className={styles.container}>
                <div className={styles.iconWrapper}>
                    <IoShareSocialOutline className={styles.icon} />
                </div>
                <h2 className={styles.title}>Change File Visibility</h2>
                <p className={styles.fileName}>
                    Set permissions for: <strong>{file.displayName}</strong>
                </p>

                <div className={styles.inputGroup}>
                    <label htmlFor="visibility" className={styles.label}>
                        Who can access this file?
                    </label>
                    <div className={styles.selectWrapper}>
                        <div className={styles.selectIcon}>
                            {currentVisibility === "public" ? (
                                <IoGlobe />
                            ) : currentVisibility === "private" ? (
                                <IoLockClosed />
                            ) : (
                                <IoPeople />
                            )}
                        </div>
                        <select
                            id="visibility"
                            className={styles.selectInput}
                            value={currentVisibility}
                            onChange={(e) =>
                                setCurrentVisibility(e.target.value)
                            }
                            disabled={isLoadingTeams || isSaving}
                        >
                            <option value="private">Private (Only you)</option>
                            <option value="public">Public (Everyone)</option>
                            {!isLoadingTeams && teams.length > 0 && (
                                <optgroup label="Your Teams">
                                    {teams.map((team) => (
                                        <option key={team.id} value={team.id}>
                                            {team.name}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>
                </div>

                {error && <p className={styles.error}>{error}</p>}

                <div className={styles.actions}>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`${styles.button} ${styles.cancelButton}`}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={`${styles.button} ${styles.confirmButton}`}
                        disabled={isSaving}
                    >
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
