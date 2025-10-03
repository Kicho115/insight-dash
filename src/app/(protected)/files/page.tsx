import styles from "./styles.module.css";
import { requireServerAuth } from "@/lib/serverAuth";
import { getFilesForUser } from "@/data/files";
import { FilesTable } from "@/components/FilesTable";
import { AddFileButton } from "./AddFileButton"; // A small client component for the button

export const dynamic = "force-dynamic";

export default async function FilesPage() {
    const user = await requireServerAuth();
    // Fetch data on the server, before the page is sent to the client
    const initialFiles = await getFilesForUser(user.uid);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>Your Files</h1>
                    <p>Manage and analyze your uploaded data files.</p>
                </div>
                <AddFileButton />
            </header>

            {/* Pass the server-fetched data as a prop to the client component */}
            <FilesTable initialFiles={initialFiles} />
        </div>
    );
}
