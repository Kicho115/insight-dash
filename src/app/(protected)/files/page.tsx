"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./styles.module.css";
import { File as FileMetadata } from "@/types/user";
import { useFiles } from "@/context/FilesProvider";
import { ConfirmationModal } from "@/components/confirmationModal";
import { deleteFile } from "@/services/files";
import { useAuth } from "@/context/AuthProvider";
import {
    IoDocumentTextOutline,
    IoLockClosedOutline,
    IoGlobeOutline,
    IoEllipsisHorizontal,
    IoTrashOutline,
} from "react-icons/io5";

// Helper function to format file size into a human-readable string
const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

// Helper function to format dates
const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(date);
};

export default function FilesPage() {
    // Get state directly from the context
    const { files, isLoading, error, refetchFiles } = useFiles();
    const { user } = useAuth();

    const [isDeleting, setIsDeleting] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<FileMetadata | null>(null);
    const [activeActionMenu, setActiveActionMenu] = useState<string | null>(
        null
    );
    const menuRef = useRef<HTMLDivElement>(null);

    // Close action menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setActiveActionMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleOpenDeleteModal = (file: FileMetadata) => {
        setFileToDelete(file);
        setActiveActionMenu(null);
    };

    const handleConfirmDelete = async () => {
        if (!fileToDelete) return;

        setIsDeleting(true);
        const result = await deleteFile(fileToDelete.id);

        if (result.success) {
            refetchFiles(); // Refresh the list from context
        } else {
            // Rrror handling to show a user-friendly message
            let errorMessage = "Failed to delete the file. Please try again.";
            if (result.error?.message.includes("Forbidden")) {
                errorMessage =
                    "You do not have permission to delete this file.";
            } else if (result.error?.message) {
                errorMessage = result.error.message;
            }
            alert(errorMessage);
        }

        setIsDeleting(false);
        setFileToDelete(null); // Close the modal
    };

    if (isLoading) {
        return <div className={styles.loading}>Loading files...</div>;
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Your Files</h1>
                <p>Manage and analyze your uploaded data files.</p>
            </header>

            {files.length === 0 ? (
                <div className={styles.emptyState}>
                    <IoDocumentTextOutline className={styles.emptyIcon} />
                    <h2>No files uploaded yet</h2>
                    <p>
                        Click the &quot;Upload&quot; button in the sidebar to
                        get started.
                    </p>
                </div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Size</th>
                                <th>Last Modified</th>
                                <th>Visibility</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.map((file) => (
                                <tr key={file.id}>
                                    <td>
                                        <div className={styles.fileNameCell}>
                                            <IoDocumentTextOutline
                                                className={styles.fileIcon}
                                            />
                                            {/* Using displayName for the user-friendly name */}
                                            {file.displayName}
                                        </div>
                                    </td>
                                    <td>{formatBytes(file.size || 0)}</td>
                                    <td>{formatDate(file.updatedAt)}</td>
                                    <td>
                                        <div className={styles.visibilityCell}>
                                            {file.isPublic ? (
                                                <IoGlobeOutline />
                                            ) : (
                                                <IoLockClosedOutline />
                                            )}
                                            {file.isPublic
                                                ? "Public"
                                                : "Private"}
                                        </div>
                                    </td>
                                    <td>
                                        <span
                                            className={`${styles.statusBadge} ${styles.statusReady}`}
                                        >
                                            Ready
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actionsCell}>
                                            {user &&
                                                user.id === file.creatorId && (
                                                    <>
                                                        <button
                                                            className={
                                                                styles.actionsButton
                                                            }
                                                            onClick={() =>
                                                                setActiveActionMenu(
                                                                    activeActionMenu ===
                                                                        file.id
                                                                        ? null
                                                                        : file.id
                                                                )
                                                            }
                                                        >
                                                            <IoEllipsisHorizontal />
                                                        </button>
                                                        {activeActionMenu ===
                                                            file.id && (
                                                            <div
                                                                className={
                                                                    styles.actionMenu
                                                                }
                                                                ref={menuRef}
                                                            >
                                                                <button
                                                                    className={
                                                                        styles.menuItem
                                                                    }
                                                                    onClick={() =>
                                                                        handleOpenDeleteModal(
                                                                            file
                                                                        )
                                                                    }
                                                                >
                                                                    <IoTrashOutline />
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!fileToDelete}
                onClose={() => setFileToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete File"
                message={`Are you sure you want to permanently delete "${fileToDelete?.displayName}"? This action cannot be undone.`}
                confirmText="Delete"
                isLoading={isDeleting}
            />
        </div>
    );
}
