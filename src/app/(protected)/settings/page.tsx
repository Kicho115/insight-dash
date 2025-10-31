import { requireServerAuth } from "@/lib/serverAuth";
import { getUserById } from "@/data/users";
import { ProfileSettings } from "@/components/ProfileSettings";
import styles from "./styles.module.css";

// This tells Next.js to always render this page dynamically
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    // Fetch user data on the server
    const serverUser = await requireServerAuth();
    const userProfile = await getUserById(serverUser.uid);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Settings</h1>
                <p>Manage your account and preferences.</p>
            </header>

            {/* Pass the server-fetched data to the client component */}
            <ProfileSettings user={userProfile} />
        </div>
    );
}
