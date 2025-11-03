import styles from "./styles.module.css";
import { requireServerAuth } from "@/lib/serverAuth";
import { getTeamById } from "@/data/teams";
import { TeamDetailsClient } from "@/components/TeamDetailsClient";
import { notFound } from "next/navigation";
import Link from "next/link";
import { IoChevronBack } from "react-icons/io5";

export const dynamic = "force-dynamic";

interface TeamDetailsPageProps {
    params: Promise<{ teamId: string }>;
}

export default async function IndividualTeamPage({
    params,
}: TeamDetailsPageProps) {
    const { teamId } = await params;
    let team;
    let user;

    try {
        user = await requireServerAuth();
        // 1. Fetch data on the server for initial render AND security check
        // This ensures the user has permission before we even load the page
        team = await getTeamById(teamId, user.uid);
    } catch (error) {
        console.error("Error fetching team details:", (error as Error).message);
        return notFound();
    }

    // 2. Serialize the data to pass to the client
    const serializableTeam = {
        ...team,
        createdAt: team.createdAt.toString(),
    };

    return (
        <div className={styles.container}>
            <Link href="/team" className={styles.backLink}>
                <IoChevronBack />
                Back to all teams
            </Link>

            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>{team.name}</h1>
                    <p>Manage your team members and settings.</p>
                </div>
            </header>

            {/* 3. Pass the ID and initial data to the Client Component */}
            <TeamDetailsClient
                teamId={team.id}
                initialTeam={serializableTeam}
                currentUser={user}
            />
        </div>
    );
}
