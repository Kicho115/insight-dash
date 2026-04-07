import styles from "./KpiCard.module.css";

export interface KpiCardData {
    title: string;
    value: string;
    helper?: string;
    badge?: React.ReactNode;
}

export default function KpiCard({
    title,
    value,
    helper,
    badge,
}: KpiCardData) {
    return (
        <article className={styles.card}>
            <div className={styles.cardHeader}>
                <p className={styles.cardTitle}>{title}</p>
                {badge ? <span className={styles.cardBadge}>{badge}</span> : null}
            </div>

            <div className={styles.cardValue}>{value}</div>

            {helper ? <p className={styles.cardHelper}>{helper}</p> : null}
        </article>
    );
}