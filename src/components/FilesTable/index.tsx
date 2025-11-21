"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation"; // Use for re-fetching server data
import styles from "./styles.module.css";
import { File as FileMetadata, FileStatus } from "@/types/file";
import { ConfirmationModal } from "@/components/confirmationModal";
import { RenameFileModal } from "@/components/RenameFileModal";
import { VisibilityModal } from "@/components/VisibilityModal";
import {
    deleteFile,
    renameFile,
    getDownloadLink,
    updateFileVisibility,
} from "@/services/files";
import { useAuth } from "@/context/AuthProvider";
import {
    IoDocumentTextOutline,
    IoLockClosedOutline,
    IoGlobeOutline,
    IoEllipsisHorizontal,
    IoTrashOutline,
    IoPencilOutline,
    IoDownloadOutline,
    IoInformationCircleOutline,
    IoPeopleOutline,
    IoShareSocialOutline,
} from "react-icons/io5";
import { Team } from "@/types/user";

// Hooks
import { useRealtimeFiles } from "@/hooks/useRealtimeFiles";

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

// Type allowing both Date and string for compatibility
type FileWithDates = Omit<FileMetadata, "createdAt" | "updatedAt"> & {
    createdAt: Date | string;
    updatedAt: Date | string;
};

// --- Helper para Visibilidad ---
const getVisibilityInfo = (file: FileWithDates, teams: Team[]) => {
    if (file.isPublic) {
        return { icon: <IoGlobeOutline />, text: "Public" };
    }
    if (file.teamIds && file.teamIds.length > 0) {
        const teamId = file.teamIds[0];
        const team = teams.find((t) => t.id === teamId);
        return {
            icon: <IoPeopleOutline />,
            text: team ? team.name : "Team",
        };
    }
    return { icon: <IoLockClosedOutline />, text: "Private" };
};

// Type for the serialized data coming from the server
type SerializedFile = Omit<FileMetadata, "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
};

interface FilesTableProps {
    initialFiles: SerializedFile[];
    userTeams: Team[];
}

export const FilesTable = ({ initialFiles, userTeams }: FilesTableProps) => {
    const router = useRouter();
    const { user } = useAuth();

    const [teams, setTeams] = useState(userTeams);

    // Use realtime hook to manage files state
    const files = useRealtimeFiles(initialFiles, user, teams);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    useEffect(() => {
        setTeams(userTeams);
    }, [userTeams]);

    // Deletion State
    const [isDeleting, setIsDeleting] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<FileWithDates | null>(
        null
    );

    // Rename State
    const [isRenaming, setIsRenaming] = useState(false);
    const [fileToRename, setFileToRename] = useState<FileWithDates | null>(
        null
    );

    // Download State
    const [isDownloading, setIsDownloading] = useState<string | null>(null);

    const [activeActionMenu, setActiveActionMenu] = useState<string | null>(
        null
    );
    const menuRef = useRef<HTMLDivElement>(null);

    // State to show/hide status info card
    const [showStatusInfo, setShowStatusInfo] = useState(false);

    const [isChangingVisibility, setIsChangingVisibility] = useState(false);
    const [fileToChangeVisibility, setFileToChangeVisibility] =
        useState<FileWithDates | null>(null);

    // Calculate pagination values
    const totalPages = Math.ceil(files.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedFiles = files.slice(startIndex, endIndex);

    // Reset to page 1 when files change significantly
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

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
    const handleOpenDeleteModal = (file: FileWithDates) => {
        setFileToDelete(file);
        setActiveActionMenu(null);
    };

    const handleConfirmDelete = async () => {
        if (!fileToDelete) return;

        setIsDeleting(true);
        const result = await deleteFile(fileToDelete.id);

        if (result.success) {
            // No need to refresh router, onSnapshot will update the UI
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
    const handleOpenRenameModal = (file: FileWithDates) => {
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
    const handleDownload = async (file: FileWithDates) => {
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

    // --- Visibility handlers ---
    const handleOpenVisibilityModal = (file: FileWithDates) => {
        setFileToChangeVisibility(file);
        setActiveActionMenu(null);
    };

    const handleConfirmVisibilityChange = async (newVisibility: string) => {
        if (!fileToChangeVisibility) return;
        setIsChangingVisibility(true);
        try {
            const result = await updateFileVisibility(
                fileToChangeVisibility.id,
                newVisibility
            );
            if (!result.success) {
                throw result.error || new Error("Failed to update visibility");
            }
            // No need to refresh, onSnapshot handles it
            setFileToChangeVisibility(null); // Cerrar modal
        } catch (err) {
            console.error("Failed to change visibility:", err);
            // Re-throw para que el modal muestre el error
            throw err;
        } finally {
            setIsChangingVisibility(false);
        }
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
                        {paginatedFiles.map((file) => {
                            const visibility = getVisibilityInfo(file, teams);
                            const canManage = user
                                ? user.id === file.creatorId ||
                                  file.permissions[user.id] === "admin" ||
                                  file.permissions[user.id] === "edit"
                                : false;

                            return (
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
                                            {visibility.icon}
                                            <span>{visibility.text}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <StatusBadge
                                            status={file.status || "Unknown"}
                                        />
                                    </td>
                                    <td>
                                        <div className={styles.actionsCell}>
                                            <button
                                                className={styles.actionsButton}
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
                                                    isDownloading === file.id
                                                }
                                            >
                                                {isDownloading === file.id ? (
                                                    <span
                                                        className={
                                                            styles.downloadingSpinner
                                                        }
                                                    ></span>
                                                ) : (
                                                    <IoEllipsisHorizontal />
                                                )}
                                            </button>

                                            {activeActionMenu === file.id && (
                                                <div
                                                    className={
                                                        styles.actionMenu
                                                    }
                                                    ref={menuRef}
                                                >
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
                                                    {canManage && (
                                                        <>
                                                            <button
                                                                className={`${styles.menuItem} ${styles.renameItem}`}
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    handleOpenRenameModal(
                                                                        file
                                                                    );
                                                                    e.stopPropagation();
                                                                }}
                                                            >
                                                                <IoPencilOutline />
                                                                Rename
                                                            </button>

                                                            {/* --- Botón de Visibilidad --- */}
                                                            <button
                                                                className={`${styles.menuItem} ${styles.visibilityItem}`}
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    handleOpenVisibilityModal(
                                                                        file
                                                                    );
                                                                    e.stopPropagation();
                                                                }}
                                                            >
                                                                <IoShareSocialOutline />
                                                                Visibility
                                                            </button>

                                                            <button
                                                                className={`${styles.menuItem} ${styles.deleteItem}`}
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    handleOpenDeleteModal(
                                                                        file
                                                                    );
                                                                    e.stopPropagation();
                                                                }}
                                                            >
                                                                <IoTrashOutline />
                                                                Delete
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {totalPages > 1 && (
                    <div className={styles.paginationContainer}>
                        <div className={styles.paginationInfo}>
                            Showing {startIndex + 1}-
                            {Math.min(endIndex, files.length)} of {files.length}{" "}
                            files
                        </div>
                        <div className={styles.paginationControls}>
                            <button
                                className={styles.paginationButton}
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                aria-label="First page"
                            >
                                First
                            </button>
                            <button
                                className={styles.paginationButton}
                                onClick={() =>
                                    setCurrentPage((prev) =>
                                        Math.max(1, prev - 1)
                                    )
                                }
                                disabled={currentPage === 1}
                                aria-label="Previous page"
                            >
                                Previous
                            </button>

                            <div className={styles.pageNumbers}>
                                {Array.from(
                                    { length: totalPages },
                                    (_, i) => i + 1
                                )
                                    .filter((page) => {
                                        // Show first page, last page, current page, and pages around current
                                        return (
                                            page === 1 ||
                                            page === totalPages ||
                                            Math.abs(page - currentPage) <= 1
                                        );
                                    })
                                    .map((page, index, array) => {
                                        // Add ellipsis if there's a gap
                                        const prevPage = array[index - 1];
                                        const showEllipsis =
                                            prevPage && page - prevPage > 1;

                                        return (
                                            <div
                                                key={page}
                                                style={{
                                                    display: "flex",
                                                    gap: "4px",
                                                }}
                                            >
                                                {showEllipsis && (
                                                    <span
                                                        className={
                                                            styles.pageEllipsis
                                                        }
                                                    >
                                                        ...
                                                    </span>
                                                )}
                                                <button
                                                    className={`${
                                                        styles.pageNumber
                                                    } ${
                                                        currentPage === page
                                                            ? styles.pageNumberActive
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        setCurrentPage(page)
                                                    }
                                                    aria-label={`Page ${page}`}
                                                    aria-current={
                                                        currentPage === page
                                                            ? "page"
                                                            : undefined
                                                    }
                                                >
                                                    {page}
                                                </button>
                                            </div>
                                        );
                                    })}
                            </div>

                            <button
                                className={styles.paginationButton}
                                onClick={() =>
                                    setCurrentPage((prev) =>
                                        Math.min(totalPages, prev + 1)
                                    )
                                }
                                disabled={currentPage === totalPages}
                                aria-label="Next page"
                            >
                                Next
                            </button>
                            <button
                                className={styles.paginationButton}
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                aria-label="Last page"
                            >
                                Last
                            </button>
                        </div>
                    </div>
                )}
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
            <VisibilityModal
                isOpen={!!fileToChangeVisibility}
                onClose={() => setFileToChangeVisibility(null)}
                onSave={handleConfirmVisibilityChange}
                file={
                    fileToChangeVisibility
                        ? {
                              ...fileToChangeVisibility,
                              createdAt: new Date(
                                  fileToChangeVisibility.createdAt
                              ),
                              updatedAt: new Date(
                                  fileToChangeVisibility.updatedAt
                              ),
                          }
                        : null
                }
                isSaving={isChangingVisibility}
            />
        </>
    );
};
