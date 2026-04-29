"use client";

import { IoClose } from "react-icons/io5";
import { ChartPanel } from "@/components/ChartPanel";
import KpiCard from "@/components/KpiCard/KpiCard";
import { formatKpiValue, kpiBadge } from "@/lib/helpers/dashboard";
import type { Dashboard } from "@/types/dashboard";
import styles from "./styles.module.css";

type Props = {
    dashboard: Dashboard | null;
    loading: boolean;
    onClose: () => void;
};

export default function DashboardBottomSheet({
    dashboard,
    loading,
    onClose,
}: Props) {
    if (!loading && !dashboard) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
                <header className={styles.header}>
                    <h2 className={styles.title}>
                        {dashboard?.title ?? "Dashboard"}
                    </h2>
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Close dashboard"
                    >
                        <IoClose />
                    </button>
                </header>

                <div className={styles.body}>
                    {loading ? (
                        <div className={styles.loading}>
                            <div className={styles.spinner} />
                            Generating your dashboard…
                        </div>
                    ) : (
                        dashboard && (
                            <>
                                {dashboard.kpis.length > 0 && (
                                    <div className={styles.kpiGrid}>
                                        {dashboard.kpis.map((kpi) => (
                                            <KpiCard
                                                key={kpi.id}
                                                title={kpi.label}
                                                value={formatKpiValue(kpi)}
                                                helper={kpi.helper}
                                                badge={kpiBadge(kpi.format)}
                                            />
                                        ))}
                                    </div>
                                )}

                                {dashboard.charts.length > 0 && (
                                    <div className={styles.chartsGrid}>
                                        {dashboard.charts.map((chart) => (
                                            <ChartPanel
                                                key={chart.id}
                                                chart={chart}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
