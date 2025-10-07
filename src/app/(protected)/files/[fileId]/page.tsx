// Server component: Detalle del archivo + Chat
import { notFound } from "next/navigation";

// Data
import { getFileById } from "@/data/files";
import { getUserById } from "@/data/users";

// Helpers
import { requireServerAuth } from "@/lib/serverAuth";
import { formatFirestoreDate } from "@/lib/helpers/formatDate";
import { formatBytes } from "@/lib/helpers/formatBytes";

// UI
import { StatusBadge } from "@/components/StatusBadge";
import FileChat from "@/components/fileChat";

// Icons
import { BsFiletypeXlsx, BsFiletypeCsv } from "react-icons/bs";

// Styles
import styles from "./styles.module.css";

export default async function FilePage({
  params,
}: {
  params: { fileId: string }; // 👈 usar SIEMPRE "fileId" aquí
}) {
  const user = await requireServerAuth();

  // Carga del archivo + permiso
  const file = await getFileById(params.fileId, user.uid).catch(() => null);
  if (!file) notFound();

  const fileExtension = file?.name?.split(".").pop()?.toLowerCase();
  const fileOwner = file?.creatorId ? await getUserById(file.creatorId) : null;

  return (
    <div className={styles.container}>
      {/* Header con icono + nombre + estado */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {fileExtension === "xlsx" ? (
            <div className={`${styles.fileIcon} ${styles.excel}`}>
              <BsFiletypeXlsx size={40} />
            </div>
          ) : (
            <div className={`${styles.fileIcon} ${styles.csv}`}>
              <BsFiletypeCsv size={40} />
            </div>
          )}
          <div className={styles.headerNames}>
            <h1>{file.displayName ?? file.name}</h1>
            <p className={styles.headerText}>{file.name}</p>
          </div>
        </div>
        <StatusBadge status={file.status ?? "Not ready"} />
      </div>

      {/* Summary */}
      <div className={styles.summary}>
        <h2 className={styles.subtitle}>Summary</h2>
        <p className={styles.summaryText}>
          {file.summary ?? "No summary available."}
        </p>
      </div>

      {/* Metadata */}
      <div className={styles.metadata}>
        <h2 className={styles.subtitle}>Metadata</h2>
        <p>Size: {formatBytes(file.size)}</p>
        <p>Created: {formatFirestoreDate(file.createdAt)}</p>
        <p>Uploaded by: {fileOwner ? fileOwner.name : "Unknown"}</p>
      </div>

      {/* Chat con la IA */}
      <div className={styles.summary}>
        <h2 className={styles.subtitle}>Chat</h2>
        <FileChat file={file} />
      </div>
    </div>
  );
}
