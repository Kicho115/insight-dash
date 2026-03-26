"use client";

import { useMemo } from "react";
import type { Chart as ChartSpec } from "@/types/dashboard";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Filler,
    Tooltip,
    Legend,
} from "chart.js";
import { Bar, Line, Pie, Doughnut } from "react-chartjs-2";
import styles from "./styles.module.css";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Filler,
    Tooltip,
    Legend,
);

/** Fallback palette used when a yKey does not specify an explicit color. */
const DEFAULT_COLORS = [
    "#4f46e5",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
];

/**
 * Returns the explicit color if provided, otherwise cycles through
 * {@link DEFAULT_COLORS} using the series index.
 */
function getColor(index: number, explicit?: string): string {
    return explicit ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

type Props = { chart: ChartSpec };

/**
 * Renders a single chart card from a {@link ChartSpec} definition.
 *
 * Supports `bar`, `line`, `area`, and `pie` chart types via chart.js.
 * The switch is exhaustive so adding a new `ChartType` without a
 * corresponding case will cause a compile-time error.
 *
 * @param props.chart - The chart specification to render. Expected shape:
 *  - `id`    — Unique identifier for the chart.
 *  - `type`  — One of `"bar"`, `"line"`, `"area"`, or `"pie"`.
 *  - `title` — Display title shown above the chart.
 *  - `data`  — Array of row objects containing the values to plot.
 *  - `xKey`  — Key within each row used for the x-axis labels.
 *  - `yKeys` — Array of `{ key, label, color? }` defining each data series.
 */
export function ChartPanel({ chart }: Props) {
    const labels = useMemo(
        () => chart.data.map((row) => String(row[chart.xKey] ?? "")),
        [chart.data, chart.xKey],
    );

    const chartElement = useMemo(() => {
        switch (chart.type) {
            case "bar":
                return (
                    <Bar
                        data={{
                            labels,
                            datasets: chart.yKeys.map((yKey, i) => ({
                                label: yKey.label,
                                data: chart.data.map((row) =>
                                    Number(row[yKey.key] ?? 0),
                                ),
                                backgroundColor: getColor(i, yKey.color),
                            })),
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: chart.yKeys.length > 1,
                                },
                            },
                        }}
                    />
                );

            case "line":
                return (
                    <Line
                        data={{
                            labels,
                            datasets: chart.yKeys.map((yKey, i) => ({
                                label: yKey.label,
                                data: chart.data.map((row) =>
                                    Number(row[yKey.key] ?? 0),
                                ),
                                borderColor: getColor(i, yKey.color),
                                backgroundColor: getColor(i, yKey.color) + "33",
                                tension: 0.3,
                                fill: false,
                            })),
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: chart.yKeys.length > 1,
                                },
                            },
                        }}
                    />
                );

            case "area":
                return (
                    <Line
                        data={{
                            labels,
                            datasets: chart.yKeys.map((yKey, i) => ({
                                label: yKey.label,
                                data: chart.data.map((row) =>
                                    Number(row[yKey.key] ?? 0),
                                ),
                                borderColor: getColor(i, yKey.color),
                                backgroundColor: getColor(i, yKey.color) + "33",
                                tension: 0.3,
                                fill: true,
                            })),
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: chart.yKeys.length > 1,
                                },
                            },
                        }}
                    />
                );

            case "pie":
                return (
                    <Pie
                        data={{
                            labels,
                            datasets: [
                                {
                                    data: chart.data.map((row) =>
                                        Number(
                                            row[chart.yKeys[0]?.key ?? ""] ?? 0,
                                        ),
                                    ),
                                    backgroundColor: chart.data.map((_, i) =>
                                        getColor(i),
                                    ),
                                    borderWidth: 2,
                                    borderColor: "#ffffff",
                                },
                            ],
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: "bottom" },
                            },
                        }}
                    />
                );

            default: {
                const _exhaustive: never = chart.type;
                return <p>Unsupported chart type: {_exhaustive}</p>;
            }
        }
    }, [chart, labels]);

    return (
        <div className={styles.card}>
            <h3 className={styles.title}>{chart.title}</h3>
            <div className={styles.chartWrapper}>{chartElement}</div>
        </div>
    );
}
