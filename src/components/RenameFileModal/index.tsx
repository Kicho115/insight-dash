"use client";

import { useState, useEffect, FormEvent } from "react";
import styles from "./styles.module.css";
import { Modal } from "@/components/Modal";
import { IoPencilOutline } from "react-icons/io5";

interface RenameFileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRename: (newName: string) => Promise<void>; // Async function for the rename operation
    currentName: string;
    isRenaming: boolean; // Loading state from parent
}

export const RenameFileModal = ({
    isOpen,
    onClose,
    onRename,
    currentName,
    isRenaming,
}: RenameFileModalProps) => {
    const [newName, setNewName] = useState(currentName);
    const [error, setError] = useState<string | null>(null);

    // Reset name when the modal opens with a different file
    useEffect(() => {
        if (isOpen) {
            setNewName(currentName);
            setError(null);
        }
    }, [isOpen, currentName]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || newName.trim() === currentName) {
            setError("Please enter a different name.");
            return;
        }
        setError(null);
        try {
            await onRename(newName.trim());
            // Parent component (FilesTable) will handle closing on success via onSnapshot update
        } catch (err) {
            setError((err as Error).message || "Failed to rename file.");
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className={styles.container}>
                <div className={styles.iconWrapper}>
                    <IoPencilOutline className={styles.icon} />
                </div>
                <h2 className={styles.title}>Rename File</h2>
                <p className={styles.currentName}>
                    Current name: <strong>{currentName}</strong>
                </p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className={styles.input}
                        placeholder="Enter new display name"
                        required
                        autoFocus
                        disabled={isRenaming}
                    />
                    {error && <p className={styles.error}>{error}</p>}
                    <div className={styles.actions}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`${styles.button} ${styles.cancelButton}`}
                            disabled={isRenaming}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`${styles.button} ${styles.confirmButton}`}
                            disabled={
                                isRenaming ||
                                !newName.trim() ||
                                newName.trim() === currentName
                            }
                        >
                            {isRenaming ? "Renaming..." : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};
