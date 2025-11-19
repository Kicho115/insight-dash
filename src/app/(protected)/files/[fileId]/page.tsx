import { notFound } from "next/navigation";

// Server-side data fetching
import { getFileById } from "@/data/files";
import { getUserById } from "@/data/users";
import { requireServerAuth } from "@/lib/serverAuth";

// Helpers
import { formatFirestoreDate } from "@/lib/helpers/formatDate";
import { formatBytes } from "@/lib/helpers/formatBytes";

// Components
import { StatusBadge } from "@/components/StatusBadge";
import ChatWidget from "@/components/ChatWidget";
import { BsFiletypeXlsx, BsFiletypeCsv } from "react-icons/bs";
import { MissingHeadersModal } from "./missingHeadersModal";

// CSS
import styles from "./styles.module.css";

export default async function FilePage({
    params,
}: {
    params: Promise<{ fileId: string }>;
}) {
    const user = await requireServerAuth();
    const { fileId } = await params;

    const file = await getFileById(fileId, user.uid).catch(() => null);
    if (!file) notFound();

    const ext = file.name?.split(".").pop()?.toLowerCase();
    const owner = file.creatorId ? await getUserById(file.creatorId) : null;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    {ext === "xlsx" ? (
                        <div className={`${styles.fileIcon} ${styles.excel}`}>
                            <BsFiletypeXlsx />
                        </div>
                    ) : (
                        <div className={`${styles.fileIcon} ${styles.csv}`}>
                            <BsFiletypeCsv />
                        </div>
                    )}
                    <div className={styles.headerNames}>
                        <h1>{file.displayName ?? file.name}</h1>
                        <p className={styles.headerText}>{file.name}</p>
                    </div>
                </div>
                <StatusBadge status={file.status ?? "Not ready"} />
            </div>

            {file.status === "Action Required" && (
                <MissingHeadersModal fileId={fileId} />
            )}

            <div className={styles.summary}>
                <h2 className={styles.subtitle}>Summary</h2>
                <p className={styles.summaryText}>
                    {file.metadata?.summary ?? "No summary available."}
                </p>
            </div>

            <div className={styles.metadata}>
                <h2 className={styles.subtitle}>Metadata</h2>
                <p>Size: {formatBytes(file.size)}</p>
                <p>Created: {formatFirestoreDate(file.createdAt)}</p>
                <p>Uploaded by: {owner ? owner.name : "Unknown"}</p>
                {file.metadata && "sheets" in file.metadata ? (
                    <>
                        <p>Number of sheets: {file.metadata.sheets.length}</p>
                        <div className={styles.excelInfo}>
                            <h3>Sheets Information</h3>
                            {file.metadata.sheets.map((sheet, index) => (
                                <div key={index} className={styles.sheetInfo}>
                                    <p>
                                        <strong>{sheet.name}</strong>
                                    </p>
                                    <p>Rows: {sheet.numberOfRows}</p>
                                    <p>Columns: {sheet.numberOfColumns}</p>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <p>
                        Number of rows: {file.metadata?.numberOfRows ?? "N/A"}
                    </p>
                )}
            </div>

            <div className={styles.dashboardHint}>
                <p>
                    <strong>Ready to visualize?</strong> Chat with your data to explore insights,
                    then ask the assistant to generate a custom dashboard with charts and KPIs.
                </p>
            </div>

            {/* Floating chat only on file page; server will add metadata context */}
            <ChatWidget fileId={fileId} />
        </div>
    );
}
