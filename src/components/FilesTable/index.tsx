"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation"; // Use for re-fetching server data
import styles from "./styles.module.css";
import { File as FileMetadata, FileStatus } from "@/types/file";
import { ConfirmationModal } from "@/components/confirmationModal";
import { RenameFileModal } from "@/components/RenameFileModal";
import { deleteFile, renameFile, getDownloadLink } from "@/services/files";
import { useAuth } from "@/context/AuthProvider";
import { useFiles } from "@/context/FilesProvider";
import {
    IoDocumentTextOutline,
    IoLockClosedOutline,
    IoGlobeOutline,
    IoEllipsisHorizontal,
    IoTrashOutline,
    IoPencilOutline,
    IoDownloadOutline,
    IoInformationCircleOutline,
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

// Component to render the status badge based on file status
const StatusBadge = ({ status }: { status: FileStatus }) => {
    let style = styles.statusBadge;
    let text = status;

    switch (status) {
        case "Uploaded":
            style += ` ${styles.statusUploaded}`;
            text = "Uploaded";
            break;
        case "Processing":
            style += ` ${styles.statusProcessing}`;
            text = "Processing";
            break;
        case "Ready":
            style += ` ${styles.statusReady}`;
            text = "Ready";
            break;
        case "Error":
            style += ` ${styles.statusError}`;
            text = "Error";
            break;
        default:
            style += ` ${styles.statusUnknown}`;
            text = "Error";
    }

    return <span className={style}>{text}</span>;
};

export const FilesTable = () => {
    const router = useRouter();
    const { user } = useAuth();

    const { files, isLoading, error } = useFiles();

    // Deletion State
    const [isDeleting, setIsDeleting] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<FileMetadata | null>(null);

    // Rename State
    const [isRenaming, setIsRenaming] = useState(false);
    const [fileToRename, setFileToRename] = useState<FileMetadata | null>(null);

    // Download State
    const [isDownloading, setIsDownloading] = useState<string | null>(null);

    const [activeActionMenu, setActiveActionMenu] = useState<string | null>(
        null
    );
    const menuRef = useRef<HTMLDivElement>(null);

    // State to show/hide status info card
    const [showStatusInfo, setShowStatusInfo] = useState(false);

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

    // --- Delete Handlers ---
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

    // --- Rename Handlers ---
    const handleOpenRenameModal = (file: FileMetadata) => {
        setFileToRename(file);
        setActiveActionMenu(null);
    };
    const handleConfirmRename = async (newName: string) => {
        if (!fileToRename) return;
        setIsRenaming(true);
        try {
            const result = await renameFile(fileToRename.id, newName);
            if (!result.success) {
                throw result.error || new Error("Rename failed");
            }
            // Success! onSnapshot will update the table. Close modal.
            setFileToRename(null);
        } catch (err) {
            console.error("Rename failed:", err);
            // Re-throw to be caught by the modal's error handling
            throw err;
        } finally {
            setIsRenaming(false);
        }
    };

    // --- Download Handler ---
    const handleDownload = async (file: FileMetadata) => {
        setActiveActionMenu(null);
        setIsDownloading(file.id);
        try {
            const downloadUrl = await getDownloadLink(file.id);
            if (downloadUrl) {
                // Open the download link in a new tab
                window.open(downloadUrl, "_blank");
            } else {
                alert("Could not get download link. Please try again.");
            }
        } catch (err) {
            console.log("Error al descargar el archivo: " + err);
            alert("Error preparing download. Please try again.");
        } finally {
            setIsDownloading(null);
        }
    };

    // Use the isLoading state from the context for the initial load
    if (isLoading) {
        return <div className={styles.loading}>Loading files...</div>;
    }

    // Use the error state from the context
    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

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
                            {/* --- STATUS HEADER WITH INFO ICON --- */}
                            <th className={styles.statusHeaderCell}>
                                Status
                                <div
                                    className={styles.statusInfoIconWrapper}
                                    onMouseEnter={() => setShowStatusInfo(true)}
                                    onMouseLeave={() =>
                                        setShowStatusInfo(false)
                                    }
                                    onFocus={() => setShowStatusInfo(true)}
                                    onBlur={() => setShowStatusInfo(false)}
                                    onClick={() =>
                                        setShowStatusInfo((prev) => !prev)
                                    }
                                    tabIndex={0}
                                    aria-label="Status Info"
                                >
                                    <IoInformationCircleOutline />
                                    {showStatusInfo && (
                                        <div className={styles.statusInfoCard}>
                                            <strong>Status explanation:</strong>
                                            <ul>
                                                <li>
                                                    <b>Uploaded:</b> File is
                                                    waiting to be processed.
                                                </li>
                                                <li>
                                                    <b>Processing:</b> File is
                                                    currently being processed.
                                                </li>
                                                <li>
                                                    <b>Ready:</b> File is
                                                    processed and ready for
                                                    analysis.
                                                </li>
                                                <li>
                                                    <b>Error:</b> An error
                                                    occurred during processing.
                                                </li>
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </th>
                            {/* --- END STATUS HEADER --- */}
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
                                    <StatusBadge
                                        status={file.status || "Unknown"}
                                    />
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
                                                        setActiveActionMenu(
                                                            activeActionMenu ===
                                                                file.id
                                                                ? null
                                                                : file.id
                                                        );
                                                        e.stopPropagation();
                                                    }}
                                                    disabled={
                                                        isDownloading ===
                                                        file.id
                                                    } // Disable while downloading this file
                                                >
                                                    {isDownloading ===
                                                    file.id ? (
                                                        <span
                                                            className={
                                                                styles.downloadingSpinner
                                                            }
                                                        ></span> // Basic spinner
                                                    ) : (
                                                        <IoEllipsisHorizontal />
                                                    )}
                                                </button>
                                                {activeActionMenu ===
                                                    file.id && (
                                                    <div
                                                        className={
                                                            styles.actionMenu
                                                        }
                                                        ref={menuRef}
                                                    >
                                                        {/* Rename Button */}
                                                        <button
                                                            className={`${styles.menuItem} ${styles.renameItem}`}
                                                            onClick={(e) => {
                                                                handleOpenRenameModal(
                                                                    file
                                                                );
                                                                e.stopPropagation();
                                                            }}
                                                        >
                                                            <IoPencilOutline />
                                                            Rename
                                                        </button>
                                                        {/* Download Button */}
                                                        <button
                                                            className={`${styles.menuItem} ${styles.downloadItem}`}
                                                            onClick={(e) => {
                                                                handleDownload(
                                                                    file
                                                                );
                                                                e.stopPropagation();
                                                            }}
                                                        >
                                                            <IoDownloadOutline />
                                                            Download
                                                        </button>
                                                        {/* Delete Button */}
                                                        <button
                                                            className={`${styles.menuItem} ${styles.deleteItem}`}
                                                            onClick={(e) => {
                                                                handleOpenDeleteModal(
                                                                    file
                                                                );
                                                                e.stopPropagation();
                                                            }}
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
            <RenameFileModal
                isOpen={!!fileToRename}
                onClose={() => setFileToRename(null)}
                onRename={handleConfirmRename}
                currentName={fileToRename?.displayName || ""}
                isRenaming={isRenaming}
            />
        </>
    );
};
