"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";
import { TeamMember, TeamMemberRole, Team as TeamType } from "@/types/user";
import { ServerAuthUser } from "@/lib/serverAuth";
import {
    IoPersonCircleSharp,
    IoShieldCheckmark,
    IoMailOutline,
    IoEllipsisHorizontal,
    IoArrowUpCircleOutline,
    IoArrowDownCircleOutline,
    IoTrashOutline,
} from "react-icons/io5";
import { sendInvitation } from "@/services/invitations";
import { InviteMemberModal } from "@/components/InviteMemberModal";
import { removeMember, updateMemberRole } from "@/services/teams";
import { useRouter } from "next/navigation";
import { ConfirmationModal } from "../confirmationModal";

type Team = Omit<TeamType, "createdAt"> & {
    createdAt: string;
};

interface TeamDetailsClientProps {
    team: Team;
    currentUser: ServerAuthUser; // The authenticated user
}

// Helper to get role display name and icon
const getRoleInfo = (role: string) => {
    switch (role) {
        case "owner":
            return {
                label: "Owner",
                icon: <IoShieldCheckmark className={styles.ownerIcon} />,
            };
        case "admin":
            return {
                label: "Admin",
                icon: <IoShieldCheckmark className={styles.adminIcon} />,
            };
        default:
            return { label: "Member", icon: null };
    }
};

const MemberActionMenu = ({
    member,
    currentUserRole,
    onRemove,
    onUpdateRole,
}: {
    member: TeamMember;
    currentUserRole: TeamMemberRole;
    onRemove: () => void;
    onUpdateRole: (newRole: TeamMemberRole) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // --- Permission Logic ---
    const canOwnerManage =
        currentUserRole === "owner" && member.role !== "owner";
    const canAdminManage =
        currentUserRole === "admin" && member.role === "member";

    if (!canOwnerManage && !canAdminManage) {
        return null;
    }

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={styles.actionMenuContainer} ref={menuRef}>
            <button
                className={styles.actionMenuButton}
                onClick={() => setIsOpen(!isOpen)}
            >
                <IoEllipsisHorizontal />
            </button>

            {isOpen && (
                <div className={styles.actionMenu}>
                    {/* Role Change Button */}
                    {member.role === "member" && canOwnerManage && (
                        <button
                            className={styles.menuItem}
                            onClick={() => onUpdateRole("admin")}
                        >
                            <IoArrowUpCircleOutline />
                            Make Admin
                        </button>
                    )}
                    {member.role === "admin" && canOwnerManage && (
                        <button
                            className={styles.menuItem}
                            onClick={() => onUpdateRole("member")}
                        >
                            <IoArrowDownCircleOutline />
                            Make Member
                        </button>
                    )}

                    {/* Remove Button */}
                    <button
                        className={`${styles.menuItem} ${styles.deleteItem}`}
                        onClick={onRemove}
                    >
                        <IoTrashOutline />
                        Remove Member
                    </button>
                </div>
            )}
        </div>
    );
};

export const TeamDetailsClient = ({
    team,
    currentUser,
}: TeamDetailsClientProps) => {
    const router = useRouter();
    const [members] = useState(team.members);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);

    const [isDeleting, setIsDeleting] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(
        null
    );

    const [isUpdatingRole, setIsUpdatingRole] = useState(false);

    // Find out if the current user is an Admin or Owner
    const currentUserRole =
        members.find((m) => m.userId === currentUser.uid)?.role || "member";
    const canManage =
        currentUserRole === "owner" || currentUserRole === "admin";

    const handleSendInvite = async (email: string) => {
        setIsInviting(true);
        setInviteError(null);
        try {
            const result = await sendInvitation(team.id, email);
            if (result.success) {
                setIsInviteModalOpen(false);
            } else {
                throw result.error || new Error("Failed to send invite");
            }
        } catch (err) {
            setInviteError((err as Error).message);
            // Re-throw for the modal to also handle its internal state
            throw err;
        } finally {
            setIsInviting(false);
        }
    };

    const handleOpenDeleteModal = (member: TeamMember) => {
        setMemberToDelete(member);
    };
    const handleConfirmDelete = async () => {
        if (!memberToDelete) return;
        setIsDeleting(true);
        const result = await removeMember(team.id, memberToDelete.userId);
        if (result.success) {
            router.refresh();
        } else {
            alert(result.error?.message || "Failed to remove member.");
        }
        setIsDeleting(false);
        setMemberToDelete(null);
    };

    const handleRoleUpdate = async (
        member: TeamMember,
        newRole: TeamMemberRole
    ) => {
        setIsUpdatingRole(true);
        const result = await updateMemberRole(team.id, member.userId, newRole);
        if (result.success) {
            router.refresh();
        } else {
            alert(result.error?.message || "Failed to update role.");
        }
        setIsUpdatingRole(false);
    };

    return (
        <>
            <div className={styles.card}>
                <header className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>
                        Members ({members.length})
                    </h2>
                    {canManage && (
                        <button
                            className={styles.inviteButton}
                            onClick={() => {
                                setInviteError(null);
                                setIsInviteModalOpen(true);
                            }}
                        >
                            <IoMailOutline />
                            Invite Member
                        </button>
                    )}
                </header>

                <div className={styles.memberList}>
                    {members.map((member) => {
                        const roleInfo = getRoleInfo(member.role);
                        return (
                            <div
                                key={member.userId}
                                className={styles.memberRow}
                            >
                                <div className={styles.memberInfo}>
                                    <IoPersonCircleSharp
                                        className={styles.avatar}
                                    />
                                    <div>
                                        <span className={styles.memberName}>
                                            {member.name}
                                            {member.userId ===
                                                currentUser.uid && " (You)"}
                                        </span>
                                        <span className={styles.memberEmail}>
                                            {member.email}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.memberRole}>
                                    {roleInfo.icon}
                                    <span>{roleInfo.label}</span>
                                    {member.userId !== currentUser.uid && (
                                        <MemberActionMenu
                                            member={member}
                                            currentUserRole={currentUserRole}
                                            onRemove={() =>
                                                handleOpenDeleteModal(member)
                                            }
                                            onUpdateRole={(newRole) =>
                                                handleRoleUpdate(
                                                    member,
                                                    newRole
                                                )
                                            }
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <InviteMemberModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onInvite={handleSendInvite}
                isLoading={isInviting}
                error={inviteError}
            />
            <ConfirmationModal
                isOpen={!!memberToDelete}
                onClose={() => setMemberToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Remove Member"
                message={`Are you sure you want to remove ${memberToDelete?.name} from the team?`}
                confirmText="Remove"
                isLoading={isDeleting}
            />
        </>
    );
};
