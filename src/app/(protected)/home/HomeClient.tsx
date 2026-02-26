"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./styles.module.css";
import { useAuth } from "@/context/AuthProvider";
import { StatusBadge } from "@/components/StatusBadge";
import { File } from "@/types/file";
import { acceptInvitation, declineInvitation } from "@/services/invitations";

type SerializedFile = Omit<File, "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
};

interface HomeClientProps {
    recentFiles: SerializedFile[];
    filesNeedingAttention: SerializedFile[];
}

const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
    }).format(date);
};

export const HomeClient = ({ recentFiles, filesNeedingAttention }: HomeClientProps) => {
    const [greeting, setGreeting] = useState("");
    const { user, invitations } = useAuth();
    const [processingInvitations, setProcessingInvitations] = useState<Set<string>>(new Set());

    useEffect(() => {
        const getGreeting = () => {
            const hour = new Date().getHours();

            if (hour >= 5 && hour < 12) {
                return "Good Morning";
            } else if (hour >= 12 && hour < 19) {
                return "Good Afternoon";
            } else {
                return "Good Evening";
            }
        };

        setGreeting(getGreeting());
    }, []);

    const handleAcceptInvitation = async (invitationId: string) => {
        setProcessingInvitations(prev => new Set(prev).add(invitationId));
        const result = await acceptInvitation(invitationId);
        if (!result.success) {
            console.error("Failed to accept invitation:", result.error);
        }
        setProcessingInvitations(prev => {
            const newSet = new Set(prev);
            newSet.delete(invitationId);
            return newSet;
        });
    };

    const handleDeclineInvitation = async (invitationId: string) => {
        setProcessingInvitations(prev => new Set(prev).add(invitationId));
        const result = await declineInvitation(invitationId);
        if (!result.success) {
            console.error("Failed to decline invitation:", result.error);
        }
        setProcessingInvitations(prev => {
            const newSet = new Set(prev);
            newSet.delete(invitationId);
            return newSet;
        });
    };

    const hasActionItems = invitations.length > 0 || filesNeedingAttention.length > 0;

    return (
        <div className={styles.container}>
            {/* Greeting Section */}
            <div className={styles.greetingWrapper}>
                <div className={styles.greetingContent}>
                    <h1 className={styles.greetingText}>{greeting}</h1>
                    <p className={styles.userName}>{user?.name}</p>
                    <div className={styles.underline}></div>
                </div>
            </div>

            {/* Main Content */}
            <div className={styles.sectionsWrapper}>
                {/* Recent Files Section */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Recent Files</h2>
                    {recentFiles.length > 0 ? (
                        <div className={styles.filesList}>
                            {recentFiles.map((file) => (
                                <Link
                                    key={file.id}
                                    href={`/files/${file.id}`}
                                    className={styles.fileItem}
                                >
                                    <div className={styles.fileInfo}>
                                        <span className={styles.fileName}>{file.displayName}</span>
                                        <span className={styles.fileTime}>
                                            {formatRelativeTime(file.updatedAt)}
                                        </span>
                                    </div>
                                    <StatusBadge status={file.status} />
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.emptyState}>
                            No files yet. Upload your first file to get started.
                        </p>
                    )}
                </section>

                {/* Action Items Section */}
                {hasActionItems && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Requires Attention</h2>
                        <div className={styles.actionsList}>
                            {/* Pending Invitations */}
                            {invitations.map((invitation) => (
                                <div key={invitation.id} className={styles.actionItem}>
                                    <div className={styles.actionInfo}>
                                        <span className={styles.actionIcon}>📨</span>
                                        <div className={styles.actionText}>
                                            <span className={styles.actionTitle}>
                                                Team invitation
                                            </span>
                                            <span className={styles.actionDescription}>
                                                {invitation.inviterName} invited you to join{" "}
                                                <strong>{invitation.teamName}</strong>
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.actionButtons}>
                                        <button
                                            className={styles.acceptButton}
                                            onClick={() => handleAcceptInvitation(invitation.id)}
                                            disabled={processingInvitations.has(invitation.id)}
                                        >
                                            {processingInvitations.has(invitation.id) ? "..." : "Accept"}
                                        </button>
                                        <button
                                            className={styles.declineButton}
                                            onClick={() => handleDeclineInvitation(invitation.id)}
                                            disabled={processingInvitations.has(invitation.id)}
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Files needing attention */}
                            {filesNeedingAttention.map((file) => (
                                <Link
                                    key={file.id}
                                    href={`/files/${file.id}`}
                                    className={styles.actionItem}
                                >
                                    <div className={styles.actionInfo}>
                                        <span className={styles.actionIcon}>
                                            {file.status === "Error" ? "❌" : "⚠️"}
                                        </span>
                                        <div className={styles.actionText}>
                                            <span className={styles.actionTitle}>
                                                {file.displayName}
                                            </span>
                                            <span className={styles.actionDescription}>
                                                {file.status === "Error"
                                                    ? "File processing failed"
                                                    : "Action required"}
                                            </span>
                                        </div>
                                    </div>
                                    <StatusBadge status={file.status} />
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};
