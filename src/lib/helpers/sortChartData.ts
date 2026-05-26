import type { Chart } from "@/types/dashboard";

type DataRow = Record<string, unknown>;

const MONTH_ORDER: Record<string, number> = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sep: 9, sept: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12,
};

function isLikelyTimeDimension(xKey: string): boolean {
    const token = xKey.toLowerCase();
    return ["date", "time", "month", "year", "week", "day", "period"].some(
        (part) => token.includes(part),
    );
}

export function sortChartData(data: DataRow[], chart: Chart): DataRow[] {
    if (data.length === 0) return data;

    const xValues = data.map((row) => String(row[chart.xKey] ?? ""));

    const allNumeric = xValues.every(
        (v) => v !== "" && Number.isFinite(Number(v)),
    );
    if (allNumeric) {
        return [...data].sort(
            (a, b) => Number(a[chart.xKey] ?? 0) - Number(b[chart.xKey] ?? 0),
        );
    }

    if (
        chart.type === "line" ||
        chart.type === "area" ||
        isLikelyTimeDimension(chart.xKey)
    ) {
        return [...data].sort((a, b) => {
            const aValue = String(a[chart.xKey] ?? "");
            const bValue = String(b[chart.xKey] ?? "");

            const aMonth = MONTH_ORDER[aValue.toLowerCase()];
            const bMonth = MONTH_ORDER[bValue.toLowerCase()];
            if (aMonth !== undefined && bMonth !== undefined) {
                return aMonth - bMonth;
            }

            const aTime = Date.parse(aValue);
            const bTime = Date.parse(bValue);
            if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
                return aTime - bTime;
            }

            return aValue.localeCompare(bValue);
        });
    }

    const firstY = chart.yKeys[0]?.key;
    if (!firstY) return data;

    return [...data].sort(
        (a, b) => Number(b[firstY] ?? 0) - Number(a[firstY] ?? 0),
    );
}
