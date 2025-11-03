// This is a Server Component - no "use client"
import styles from "./styles.module.css";
import { requireServerAuth } from "@/lib/serverAuth";
import { getTeamsForUser } from "@/data/teams"; // Fetches data directly on the server
import { getUserById } from "@/data/users";
import { TeamPageClient } from "@/components/TeamPageClient"; // The client component

// This ensures the page is always dynamic and fetches fresh data
export const dynamic = "force-dynamic";

export default async function TeamPage() {
    // 1. Authenticate and fetch data on the server
    const serverUser = await requireServerAuth();
    // Get the full user profile (needed for the create modal)
    const userProfile = await getUserById(serverUser.uid);
    // Get the user's teams
    const initialTeams = await getTeamsForUser(serverUser.uid);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>Your Teams</h1>
                    <p>Create and manage your teams for collaboration.</p>
                </div>
            </header>

            {/* Pass the server-fetched data as props to the Client Component.
        The client component will handle all state and interactions.
      */}
            <TeamPageClient initialTeams={initialTeams} user={userProfile} />
        </div>
    );
}
