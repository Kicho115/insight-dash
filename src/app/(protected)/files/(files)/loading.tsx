import styles from "./styles.module.css";
import { LoadingSpinner } from "@/components/loading";

/**
 * @component FilesLoading
 * @description Loading UI displayed via Suspense while the FilesPage data is loading.
 */
export default function FilesLoading() {
    return (
        <div className={styles.container}>
            {/* Render the static header immediately */}
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <h1 className={styles.headerH1}>Your Files</h1>
                    <p className={styles.headerP}>
                        Manage and analyze your uploaded data files.
                    </p>
                </div>
                <div style={{ width: "120px" }}></div>
            </header>
            <LoadingSpinner text="Loading files..." size="medium" />
        </div>
    );
}
