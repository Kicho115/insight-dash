import styles from "./styles.module.css";

interface StatusBadgeProps {
    status: "Not ready" | "Ready" | "Processing";
}

const statusStyles = {
    "Not ready": styles.notReady,
    Ready: styles.ready,
    Processing: styles.processing,
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
    return (
        <span className={`${styles.statusBadge} ${statusStyles[status]}`}>
            {status}
        </span>
    );
};
