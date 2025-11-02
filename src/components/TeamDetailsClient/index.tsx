"use client";

import { useState } from "react";
import styles from "./styles.module.css";
import { Team as TeamType } from "@/types/user";
import { ServerAuthUser } from "@/lib/serverAuth";
import {
    IoPersonCircleSharp,
    IoShieldCheckmark,
    IoMailOutline,
} from "react-icons/io5";

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

export const TeamDetailsClient = ({
    team,
    currentUser,
}: TeamDetailsClientProps) => {
    const [members, setMembers] = useState(team.members);

    // Find out if the current user is an Admin or Owner
    const currentUserRole = members.find(
        (m) => m.userId === currentUser.uid
    )?.role;
    const canManage =
        currentUserRole === "owner" || currentUserRole === "admin";

    return (
        <div className={styles.card}>
            <header className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Members ({members.length})</h2>
                {canManage && (
                    <button className={styles.inviteButton}>
                        <IoMailOutline />
                        Invite Member
                    </button>
                )}
            </header>

            <div className={styles.memberList}>
                {members.map((member) => {
                    const roleInfo = getRoleInfo(member.role);
                    return (
                        <div key={member.userId} className={styles.memberRow}>
                            <div className={styles.memberInfo}>
                                <IoPersonCircleSharp
                                    className={styles.avatar}
                                />
                                <div>
                                    <span className={styles.memberName}>
                                        {member.name}
                                        {member.userId === currentUser.uid &&
                                            " (You)"}
                                    </span>
                                    <span className={styles.memberEmail}>
                                        {member.email}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.memberRole}>
                                {roleInfo.icon}
                                <span>{roleInfo.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
