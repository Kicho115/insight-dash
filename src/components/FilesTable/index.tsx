"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation"; // Use for re-fetching server data
import styles from "./styles.module.css";
import { File as FileMetadata } from "@/types/user";
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

// Helper functions (could be moved to a 'utils' file later)
const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
        parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i]
    );
};

const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(new Date(date));
};

interface FilesTableProps {
    initialFiles: FileMetadata[];
}

export const FilesTable = ({ initialFiles }: FilesTableProps) => {
    const router = useRouter();
    const { user } = useAuth();

    const [files, setFiles] = useState(initialFiles);
    const [isDeleting, setIsDeleting] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<FileMetadata | null>(null);
    const [activeActionMenu, setActiveActionMenu] = useState<string | null>(
        null
    );
    const menuRef = useRef<HTMLDivElement>(null);

    // Update state if the initial props change (e.g., on router.refresh)
    useEffect(() => {
        setFiles(initialFiles);
    }, [initialFiles]);

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
            // THE MODERN WAY: Tell Next.js to refresh server data
            router.refresh();
        } else {
            let errorMessage = "Failed to delete the file.";
            if (result.error?.message.includes("Forbidden")) {
                errorMessage =
                    "You do not have permission to delete this file.";
            }
            alert(errorMessage);
        }

        setIsDeleting(false);
        setFileToDelete(null);
    };

    const handleFileClick = (fileId: string) => {
        router.push(`/files/${fileId}`);
    };

    if (files.length === 0) {
        return (
            <div className={styles.emptyState}>
                <IoDocumentTextOutline className={styles.emptyIcon} />
                <h2>No files uploaded yet</h2>
                <p>{'Click the "Upload File" button to get started.'}</p>
            </div>
        );
    }

    return (
        <>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Size</th>
                            <th>Last Modified</th>
                            <th>Visibility</th>
                            <th>Status</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {files.map((file) => (
                            <tr
                                key={file.id}
                                onClick={() => handleFileClick(file.id)}
                                className={styles.tableRow}
                            >
                                <td>
                                    <div className={styles.fileNameCell}>
                                        <IoDocumentTextOutline
                                            className={styles.fileIcon}
                                        />
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
                                        {file.isPublic ? "Public" : "Private"}
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
                                        {user && user.id === file.creatorId && (
                                            <>
                                                <button
                                                    className={
                                                        styles.actionsButton
                                                    }
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent fileRow click
                                                        setActiveActionMenu(
                                                            activeActionMenu ===
                                                                file.id
                                                                ? null
                                                                : file.id
                                                        );
                                                    }}
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

            <ConfirmationModal
                isOpen={!!fileToDelete}
                onClose={() => setFileToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete File"
                message={`Are you sure you want to permanently delete "${fileToDelete?.displayName}"? This action cannot be undone.`}
                confirmText="Delete"
                isLoading={isDeleting}
            />
        </>
    );
};
