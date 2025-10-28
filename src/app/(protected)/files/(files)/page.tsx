import styles from "./styles.module.css";
import { requireServerAuth } from "@/lib/serverAuth";
import { FilesTable } from "@/components/FilesTable";
import { AddFileButton } from "./AddFileButton"; // A small client component for the button

export const dynamic = "force-dynamic";

export default async function FilesPage() {
    // 1. Authenticate on the server
    await requireServerAuth();

    // Render the layout and the Client Component.
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>Your Files</h1>
                    <p>Manage and analyze your uploaded data files.</p>
                </div>
                <AddFileButton />
            </header>

            {/* FilesTable fetches and manages its own data using the context */}
            <FilesTable />
        </div>
    );
}
