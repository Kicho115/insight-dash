import { NextResponse } from "next/server";
import * as xlsx from "xlsx";
import { getFileById } from "@/data/files";
import { getFileDownloadURL } from "@/data/storage/files";
import { handleApiError } from "@/lib/api/errorHandler";
import { dashboardSchema } from "@/lib/api/schemas/dashboard";
import { requireServerAuth } from "@/lib/serverAuth";
import { generateDashboardFlow } from "@/services/genkit/flows/generateDashboard";
import type { Chart, Dashboard, KPI } from "@/types/dashboard";

const MAX_INPUT_ROWS = 5000;
const MAX_CATEGORY_POINTS = 20;
const MAX_TIME_SERIES_POINTS = 40;
const MAX_PIE_POINTS = 12;

type DataRow = Record<string, unknown>;

function normalizeToken(value: string): string {
    return value.trim().toLowerCase();
}

function toNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value !== "string") {
        return undefined;
    }

    const cleaned = value.replace(/[,$%\s]/g, "").trim();
    if (!cleaned) {
        return undefined;
    }

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function roundNumber(value: number): number {
    return Number(value.toFixed(2));
}

function findHeaderRowIndex(matrix: unknown[][], headers: string[]): number {
    const normalizedHeaders = headers.map(normalizeToken);
    const rowsToScan = Math.min(matrix.length, 25);

    for (let rowIndex = 0; rowIndex < rowsToScan; rowIndex++) {
        const row = matrix[rowIndex] ?? [];
        const normalizedRow = row.map((cell) =>
            normalizeToken(String(cell ?? "")),
        );

        const matches = normalizedHeaders.filter((header) =>
            normalizedRow.includes(header),
        ).length;

        if (
            matches >= Math.max(1, Math.floor(normalizedHeaders.length * 0.6))
        ) {
            return rowIndex;
        }
    }

    return 0;
}

function rowsFromWorksheet(
    worksheet: xlsx.WorkSheet,
    headers: string[],
): DataRow[] {
    const matrix = xlsx.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
        blankrows: false,
        raw: true,
    }) as unknown[][];

    if (matrix.length === 0) {
        return [];
    }

    const headerRowIndex = findHeaderRowIndex(matrix, headers);
    const dataRows = matrix.slice(
        headerRowIndex + 1,
        headerRowIndex + 1 + MAX_INPUT_ROWS,
    );

    return dataRows
        .map((row) => {
            const record: DataRow = {};
            headers.forEach((header, index) => {
                record[header] = row[index] ?? null;
            });
            return record;
        })
        .filter((record) =>
            headers.some((header) => {
                const value = record[header];
                return (
                    value !== null &&
                    value !== undefined &&
                    String(value).trim() !== ""
                );
            }),
        );
}

async function loadRowsFromFile(
    filePath: string,
    headers: string[],
): Promise<DataRow[]> {
    const fileExtension = filePath.split(".").pop()?.toLowerCase();
    const downloadUrl = await getFileDownloadURL(filePath);
    const response = await fetch(downloadUrl);

    if (!response.ok) {
        throw new Error(`Failed to read file from storage: ${response.status}`);
    }

    if (fileExtension === "csv") {
        const csvData = await response.text();
        const workbook = xlsx.read(csvData, { type: "string", raw: true });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) return [];
        return rowsFromWorksheet(workbook.Sheets[firstSheetName], headers);
    }

    if (fileExtension === "xlsx" || fileExtension === "xls") {
        const arrayBuffer = await response.arrayBuffer();
        const workbook = xlsx.read(arrayBuffer, { type: "array", raw: true });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) return [];
        return rowsFromWorksheet(workbook.Sheets[firstSheetName], headers);
    }

    throw new Error("Unsupported file type. Only CSV and XLSX are supported.");
}

function getNumericColumns(rows: DataRow[], headers: string[]): string[] {
    return headers.filter((header) => {
        let numeric = 0;
        let nonEmpty = 0;

        for (const row of rows) {
            const value = row[header];
            if (
                value === null ||
                value === undefined ||
                String(value).trim() === ""
            ) {
                continue;
            }
            nonEmpty += 1;
            if (toNumber(value) !== undefined) {
                numeric += 1;
            }
        }

        return nonEmpty > 0 && numeric / nonEmpty >= 0.6;
    });
}

function inferAgg(value: string): "sum" | "avg" | "count" | "min" | "max" {
    const token = value.toLowerCase();
    if (
        token.includes("avg") ||
        token.includes("average") ||
        token.includes("mean")
    ) {
        return "avg";
    }
    if (
        token.includes("count") ||
        token.includes("number") ||
        token.includes("total records")
    ) {
        return "count";
    }
    if (token.includes("min") || token.includes("lowest")) {
        return "min";
    }
    if (token.includes("max") || token.includes("highest")) {
        return "max";
    }
    return "sum";
}

function aggregate(
    values: number[],
    mode: "sum" | "avg" | "count" | "min" | "max",
): number {
    if (mode === "count") {
        return values.length;
    }
    if (values.length === 0) {
        return 0;
    }
    if (mode === "avg") {
        return values.reduce((acc, v) => acc + v, 0) / values.length;
    }
    if (mode === "min") {
        return Math.min(...values);
    }
    if (mode === "max") {
        return Math.max(...values);
    }
    return values.reduce((acc, v) => acc + v, 0);
}

function chooseKpiColumn(
    kpi: KPI,
    headers: string[],
    numericColumns: string[],
): string | undefined {
    const kpiText = `${kpi.id} ${kpi.label}`.toLowerCase();
    const exact = numericColumns.find((header) => {
        const token = normalizeToken(header);
        return kpiText.includes(token);
    });
    if (exact) return exact;

    return numericColumns.find((header) => {
        const token = normalizeToken(header);
        const parts = token.split(/[^a-z0-9]+/).filter(Boolean);
        return parts.some((part) => part.length > 2 && kpiText.includes(part));
    });
}

function hydrateKpis(kpis: KPI[], rows: DataRow[], headers: string[]): KPI[] {
    const numericColumns = getNumericColumns(rows, headers);

    return kpis.map((kpi) => {
        const mode = inferAgg(`${kpi.label} ${kpi.id}`);
        const column = chooseKpiColumn(kpi, headers, numericColumns);

        if (!column) {
            // Only fall back to row count for count-type KPIs; otherwise keep
            // the AI-generated placeholder value unchanged.
            if (mode === "count") {
                return { ...kpi, value: rows.length };
            }
            return kpi;
        }

        const values = rows
            .map((row) => toNumber(row[column]))
            .filter((value): value is number => value !== undefined);

        // No numeric values were parsed — treat as no-data and leave the
        // placeholder rather than silently returning 0.
        if (values.length === 0) {
            return kpi;
        }

        const computed = aggregate(values, mode);
        return { ...kpi, value: roundNumber(computed) };
    });
}

function isLikelyTimeDimension(xKey: string): boolean {
    const token = xKey.toLowerCase();
    return ["date", "time", "month", "year", "week", "day", "period"].some(
        (part) => token.includes(part),
    );
}

function sortChartData(data: DataRow[], chart: Chart): DataRow[] {
    if (data.length === 0) return data;

    if (
        chart.type === "line" ||
        chart.type === "area" ||
        isLikelyTimeDimension(chart.xKey)
    ) {
        return [...data].sort((a, b) => {
            const aValue = String(a[chart.xKey] ?? "");
            const bValue = String(b[chart.xKey] ?? "");
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

function maxPointsForChart(chartType: Chart["type"]): number {
    if (chartType === "pie") return MAX_PIE_POINTS;
    if (chartType === "line" || chartType === "area")
        return MAX_TIME_SERIES_POINTS;
    return MAX_CATEGORY_POINTS;
}

function hydrateChart(chart: Chart, rows: DataRow[]): Chart {
    if (!rows.length || !chart.yKeys.length) {
        return chart;
    }

    const grouped = new Map<string, Record<string, number[]>>();

    for (const row of rows) {
        const xRaw = row[chart.xKey];
        const xValue = String(xRaw ?? "Unknown").trim() || "Unknown";
        if (!grouped.has(xValue)) {
            grouped.set(xValue, {});
        }
        const target = grouped.get(xValue)!;

        chart.yKeys.forEach((yKey) => {
            const numeric = toNumber(row[yKey.key]);
            if (numeric === undefined) return;
            if (!target[yKey.key]) {
                target[yKey.key] = [];
            }
            target[yKey.key].push(numeric);
        });
    }

    const points = Array.from(grouped.entries())
        .map(([xValue, bucket]) => {
            const point: DataRow = { [chart.xKey]: xValue };

            chart.yKeys.forEach((yKey) => {
                const values = bucket[yKey.key] ?? [];
                if (!values.length) {
                    return;
                }

                const mode =
                    chart.type === "line" || chart.type === "area" ? "avg" : "sum";
                point[yKey.key] = roundNumber(aggregate(values, mode));
            });

            return Object.keys(point).length > 1 ? point : null;
        })
        .filter((point): point is DataRow => point !== null);

    const sorted = sortChartData(points, chart);
    const limited = sorted.slice(0, maxPointsForChart(chart.type));

    return {
        ...chart,
        data: limited,
    };
}

function hydrateDashboard(
    structure: Dashboard,
    rows: DataRow[],
    headers: string[],
): Dashboard {
    return {
        title: structure.title,
        kpis: hydrateKpis(structure.kpis, rows, headers),
        charts: structure.charts.map((chart) => hydrateChart(chart, rows)),
    };
}

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ fileId: string }> },
) {
    try {
        const user = await requireServerAuth();
        const { fileId } = await params;
        const file = await getFileById(fileId, user.uid);

        const headers = file.metadata?.headers;
        if (!headers || !Array.isArray(headers) || headers.length === 0) {
            return NextResponse.json(
                { error: "File headers are missing. Process the file first." },
                { status: 422 },
            );
        }

        const summary = file.metadata?.summary?.trim();
        if (!summary) {
            return NextResponse.json(
                { error: "File summary is missing. Process the file first." },
                { status: 422 },
            );
        }

        const metadata = file.metadata;
        const rowCount =
            metadata && "numberOfRows" in metadata
                ? (metadata as { numberOfRows: number }).numberOfRows
                : undefined;

        const rows = await loadRowsFromFile(file.path, headers);
        if (rows.length === 0) {
            return NextResponse.json(
                { error: "No usable rows were found in the source file." },
                { status: 422 },
            );
        }

        const structure = await generateDashboardFlow({
            fileName: file.displayName || file.name,
            headers,
            summary,
            rowCount,
        });

        const hydrated = hydrateDashboard(structure, rows, headers);
        const dashboard = dashboardSchema.parse(hydrated);

        return NextResponse.json({ success: true, dashboard });
    } catch (error) {
        console.error("[generate-dashboard/route] error:", error);
        return handleApiError(error);
    }
}
