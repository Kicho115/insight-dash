import styles from "./styles.module.css";
import { requireServerAuth } from "@/lib/serverAuth";
import { getFilesForUser } from "@/data/files"; // <-- Importamos la "receta" del DAL
import { FilesTable } from "@/components/FilesTable";
import { AddFileButton } from "./AddFileButton";
import { getTeamsForUser } from "@/data/teams"; // <-- Importamos la "receta" de equipos

// This line ensures this page is always dynamic
export const dynamic = "force-dynamic";

export default async function FilesPage() {
    // 1. Authenticate and fetch all data on the server
    const user = await requireServerAuth();

    // 2. Fetch data in parallel for maximum speed
    const [initialFiles, userTeams] = await Promise.all([
        getFilesForUser(user.uid),
        getTeamsForUser(user.uid),
    ]);

    // 3. Serialize the data to pass to the client
    // (Convert Dates to strings)
    const serializableFiles = initialFiles.map((file) => ({
        ...file,
        createdAt: file.createdAt.toString(),
        updatedAt: file.updatedAt.toString(),
    }));

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1>Your Files</h1>
                    <p>Manage and analyze your uploaded data files.</p>
                </div>
                <AddFileButton />
            </header>

            {/* 4. Pass server-fetched data as props to the Client Component */}
            <FilesTable
                initialFiles={serializableFiles}
                userTeams={userTeams}
            />
        </div>
    );
}
