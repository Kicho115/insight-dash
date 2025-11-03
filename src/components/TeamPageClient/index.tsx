"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./styles.module.css";
import { AppUser, Invitation, Team } from "@/types/user";
import { createTeam } from "@/services/teams";
import { Modal } from "@/components/modal";
import {
    IoPeopleOutline,
    IoAdd,
    IoClose,
    IoCheckmark,
    IoMail,
} from "react-icons/io5";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { acceptInvitation, declineInvitation } from "@/services/invitations";

// A simple modal component for creating a new team
interface CreateTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (teamName: string) => Promise<void>;
    isLoading: boolean;
}

const CreateTeamModal = ({
    isOpen,
    onClose,
    onCreate,
    isLoading,
}: CreateTeamModalProps) => {
    const [teamName, setTeamName] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!teamName.trim()) {
            setError("Team name cannot be empty.");
            return;
        }
        try {
            await onCreate(teamName.trim());
            setTeamName(""); // Clear field on success
            onClose();
        } catch (err) {
            setError((err as Error).message);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit} className={styles.modalContainer}>
                <h2 className={styles.modalTitle}>Create a New Team</h2>
                <p className={styles.modalSubtitle}>
                    Teams help you share and collaborate on files.
                </p>
                <div className={styles.inputGroup}>
                    <label htmlFor="teamName" className={styles.modalLabel}>
                        Team Name
                    </label>
                    <input
                        id="teamName"
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        className={styles.modalInput}
                        placeholder="e.g., Marketing Department"
                        disabled={isLoading}
                        autoFocus
                    />
                    {error && <p className={styles.modalError}>{error}</p>}
                </div>
                <div className={styles.modalActions}>
                    <button
                        type="button"
                        onClick={onClose}
                        className={styles.modalButtonSecondary}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={styles.modalButtonPrimary}
                        disabled={isLoading || !teamName.trim()}
                    >
                        {isLoading ? "Creating..." : "Create Team"}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

const InvitationList = ({
    invitations,
    onAccept,
    onDecline,
    processingId,
}: {
    invitations: Invitation[];
    onAccept: (id: string) => void;
    onDecline: (id: string) => void;
    processingId: string | null;
}) => {
    if (invitations.length === 0) {
        return null; // Don't render anything if there are no invites
    }

    return (
        <div className={styles.invitationContainer}>
            <h2 className={styles.invitationTitle}>Pending Invitations</h2>
            {invitations.map((invite) => (
                <div key={invite.id} className={styles.invitationCard}>
                    <div className={styles.invitationBody}>
                        <IoMail className={styles.invitationIcon} />
                        <div>
                            You&apos;ve been invited to join{" "}
                            <strong>{invite.teamName}</strong>
                            <span className={styles.inviterName}>
                                by {invite.inviterName}
                            </span>
                        </div>
                    </div>
                    <div className={styles.invitationActions}>
                        <button
                            className={`${styles.actionButton} ${styles.declineButton}`}
                            onClick={() => onDecline(invite.id)}
                            disabled={!!processingId}
                        >
                            {processingId === invite.id ? (
                                <span className={styles.spinner} />
                            ) : (
                                <IoClose />
                            )}
                            Decline
                        </button>
                        <button
                            className={`${styles.actionButton} ${styles.acceptButton}`}
                            onClick={() => onAccept(invite.id)}
                            disabled={!!processingId}
                        >
                            {processingId === invite.id ? (
                                <span className={styles.spinner} />
                            ) : (
                                <IoCheckmark />
                            )}
                            Accept
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

// Main client component
interface TeamPageClientProps {
    initialTeams: Team[];
    user: AppUser;
}

export const TeamPageClient = ({ initialTeams, user }: TeamPageClientProps) => {
    const router = useRouter();
    const { invitations } = useAuth();
    const [teams, setTeams] = useState(initialTeams);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [processingInvite, setProcessingInvite] = useState<string | null>(
        null
    );
    const [isLoading, setIsLoading] = useState(false);

    // Update state if server props change (after router.refresh())
    useEffect(() => {
        setTeams(initialTeams);
    }, [initialTeams]);

    const handleCreateTeam = async (teamName: string) => {
        setIsLoading(true);
        try {
            const result = await createTeam(teamName);
            if (result.success) {
                setIsModalOpen(false);
                router.refresh(); // Refresh server components to get the new list
            } else {
                throw result.error || new Error("An unknown error occurred.");
            }
        } catch (error) {
            // Re-throw to be caught by the modal's error handler
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = async (invitationId: string) => {
        setProcessingInvite(invitationId);
        await acceptInvitation(invitationId);
        // No need to show error, listener will just remove the invite
        // And we refresh to update the team list
        router.refresh();
        setProcessingInvite(null);
    };

    const handleDecline = async (invitationId: string) => {
        setProcessingInvite(invitationId);
        await declineInvitation(invitationId);
        // Listener will automatically remove the invite
        setProcessingInvite(null);
    };

    return (
        <>
            {/* --- INVITATION SECTION --- */}
            <InvitationList
                invitations={invitations}
                onAccept={handleAccept}
                onDecline={handleDecline}
                processingId={processingInvite}
            />
            <div className={styles.gridContainer}>
                {/* Create New Team Card */}
                <button
                    className={styles.createCard}
                    onClick={() => setIsModalOpen(true)}
                >
                    <div className={styles.createIconWrapper}>
                        <IoAdd />
                    </div>
                    <span className={styles.createTitle}>Create New Team</span>
                </button>

                {/* List of Existing Teams */}
                {teams.map((team) => {
                    const owner = team.members.find((m) => m.role === "owner");
                    return (
                        <Link
                            href={`/team/${team.id}`}
                            key={team.id}
                            className={styles.teamCard}
                        >
                            <div className={styles.teamIcon}>
                                <IoPeopleOutline />
                            </div>
                            <h3 className={styles.teamName}>{team.name}</h3>
                            <p className={styles.teamMeta}>
                                {team.members.length} member
                                {team.members.length !== 1 ? "s" : ""}
                            </p>
                            <p className={styles.teamMeta}>
                                Created by{" "}
                                {owner?.userId === user.id
                                    ? "you"
                                    : owner?.name}
                            </p>
                        </Link>
                    );
                })}
            </div>

            <CreateTeamModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateTeam}
                isLoading={isLoading}
            />
        </>
    );
};
