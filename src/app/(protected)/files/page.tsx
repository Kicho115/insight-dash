import styles from "./styles.module.css";
import { requireServerAuth } from "@/lib/serverAuth";
import { getFilesForUser } from "@/data/files";
import { FilesTable } from "@/components/FilesTable";
import { AddFileButton } from "./AddFileButton";

export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const user = await requireServerAuth();
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

      <FilesTable initialFiles={initialFiles} />
    </div>
  );
}
