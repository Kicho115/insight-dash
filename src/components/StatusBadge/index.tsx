import styles from "./styles.module.css";
import { FileStatus } from "@/types/file";

interface StatusBadgeProps {
    status: FileStatus;
}

const statusStyles = {
    Uploaded: styles.notReady,
    Ready: styles.ready,
    Processing: styles.processing,
    Error: styles.error,
    "Action Required": styles.actionRequired,
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
    return (
        <span className={`${styles.statusBadge} ${statusStyles[status]}`}>
            {status}
        </span>
    );
};
