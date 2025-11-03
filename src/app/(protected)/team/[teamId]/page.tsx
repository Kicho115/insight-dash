// This is a Server Component
import styles from "./styles.module.css";
import { requireServerAuth } from "@/lib/serverAuth";
import { getTeamById } from "@/data/teams"; // La nueva "receta"
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
        team = await getTeamById(teamId, user.uid);
    } catch (error) {
        console.error("Error fetching team details:", (error as Error).message);
        // If the team is not found or user doesn't have access, show a 404 page
        return notFound();
    }

    // We must serialize the data before passing it to the Client Component.
    // Convert any non-plain objects (like Timestamps or Dates) to strings.
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

            {/* Pass server-fetched data to the Client Component */}
            <TeamDetailsClient team={serializableTeam} currentUser={user} />
        </div>
    );
}
