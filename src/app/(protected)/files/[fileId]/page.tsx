// Next.js
import { notFound } from "next/navigation";

// Server-side data
import { getFileById } from "@/data/files";
import { getUserById } from "@/data/users";

// Helpers
import { requireServerAuth } from "@/lib/serverAuth";
import { formatFirestoreDate } from "@/lib/helpers/formatDate";
import { formatBytes } from "@/lib/helpers/formatBytes";

// Components
import { StatusBadge } from "@/components/StatusBadge";

// Icons
import { BsFiletypeXlsx } from "react-icons/bs";
import { BsFiletypeCsv } from "react-icons/bs";

// Styles
import styles from "./styles.module.css";

export default async function FilePage({
    params,
}: {
    params: Promise<{ fileId: string }>;
}) {
    const user = await requireServerAuth();

    // Carga del archivo + permiso
    const fileId = (await params).fileId;
    const file = await getFileById(fileId, user.uid).catch(() => null);
    if (!file) notFound();

    const fileExtension = file?.name?.split(".").pop()?.toLowerCase();
    const fileOwner = file?.creatorId
        ? await getUserById(file.creatorId)
        : null;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    {fileExtension === "xlsx" ? (
                        <div className={`${styles.fileIcon} ${styles.excel}`}>
                            <BsFiletypeXlsx />
                        </div>
                    ) : (
                        <div className={`${styles.fileIcon} ${styles.csv}`}>
                            <BsFiletypeCsv />
                        </div>
                    )}
                    <div className={styles.headerNames}>
                        <h1>{file.displayName}</h1>
                        <p className={styles.headerText}>{file.name} </p>
                    </div>
                </div>
                <StatusBadge status={file.status ?? "Not ready"} />
            </div>
            <div className={styles.summary}>
                <h2 className={styles.subtitle}>Summary</h2>
                <p className={styles.summaryText}>
                    {file.summary ?? "No summary available."}
                </p>
            </div>
            <div className={styles.metadata}>
                <h2 className={styles.subtitle}>Metadata</h2>
                <p>Size: {formatBytes(file.size)}</p>
                <p>Created: {formatFirestoreDate(file.createdAt)}</p>
                <p>Uploaded by: {fileOwner ? fileOwner.name : "Unknown"}</p>
            </div>
        </div>
    );
}
