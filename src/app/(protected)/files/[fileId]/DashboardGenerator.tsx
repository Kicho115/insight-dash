"use client";

import { useMemo, useState } from "react";
import { ChartPanel } from "@/components/ChartPanel";
import KpiCard from "@/components/KpiCard/KpiCard";
import { formatKpiValue, kpiBadge } from "@/lib/helpers/dashboard";
import { generateDashboardForFile } from "@/services/files";
import type { Dashboard } from "@/types/dashboard";
import styles from "./styles.module.css";

type Props = {
    fileId: string;
    canGenerate: boolean;
};

export function DashboardGenerator({ fileId, canGenerate }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dashboard, setDashboard] = useState<Dashboard | null>(null);

    const buttonLabel = useMemo(() => {
        if (isLoading) return "Generating dashboard...";
        if (dashboard) return "Regenerate dashboard";
        return "Generate dashboard";
    }, [dashboard, isLoading]);

    const handleGenerate = async () => {
        if (isLoading) return;

        setError(null);
        setIsLoading(true);

        const result = await generateDashboardForFile(fileId);

        if (!result.success || !result.dashboard) {
            setError(result.error?.message || "Failed to generate dashboard.");
            setIsLoading(false);
            return;
        }

        setDashboard(result.dashboard);
        setIsLoading(false);
    };

    return (
        <section className={styles.dashboardSection}>
            <div className={styles.dashboardHeader}>
                <h2 className={styles.subtitle}>Dashboard</h2>
                <button
                    type="button"
                    className={styles.generateButton}
                    onClick={handleGenerate}
                    disabled={!canGenerate || isLoading}
                >
                    {buttonLabel}
                </button>
            </div>

            {!canGenerate && (
                <p className={styles.dashboardInfo}>
                    File must be fully processed before generating a dashboard.
                </p>
            )}

            {error && <p className={styles.dashboardError}>{error}</p>}

            {dashboard && (
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

                    {dashboard.charts.length > 0 ? (
                        <div className={styles.chartsGrid}>
                            {dashboard.charts.map((chart) => (
                                <ChartPanel key={chart.id} chart={chart} />
                            ))}
                        </div>
                    ) : (
                        <p className={styles.dashboardInfo}>
                            No charts were generated for this file.
                        </p>
                    )}
                </>
            )}
        </section>
    );
}
