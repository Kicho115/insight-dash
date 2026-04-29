import { formatBytes } from "@/lib/helpers/formatBytes";
import KpiCard, { type KpiCardData } from "./KpiCard";
import styles from "./KpiCard.module.css";
import {
    IoCalculatorOutline,
    IoStatsChartOutline,
    IoArrowUpCircleOutline,
    IoArrowDownCircleOutline,
    IoDocumentOutline,
    IoListOutline,
    IoGridOutline,
    IoDocumentsOutline,
} from "react-icons/io5";

type UnknownRecord = Record<string, unknown>;

interface FileLike {
    name?: string;
    displayName?: string;
    size?: number;
    metadata?: unknown | null;
}

interface FoundStats {
    columnLabel?: string;
    average: unknown;
    median: unknown;
    maximum: unknown;
    minimum: unknown;
}

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const cleaned = value.replace(/,/g, "").trim();
        if (!cleaned) return null;
        const parsed = Number(cleaned);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return null;
}

function getValueByKeys(record: UnknownRecord, keys: string[]): unknown {
    for (const key of keys) {
        if (key in record) {
            return record[key];
        }
    }
    return undefined;
}

function getStatPack(record: UnknownRecord): Omit<FoundStats, "columnLabel"> | null {
    const average = getValueByKeys(record, [
        "average",
        "avg",
        "mean",
        "promedio",
        "media",
    ]);

    const median = getValueByKeys(record, [
        "median",
        "mediana",
    ]);

    const maximum = getValueByKeys(record, [
        "maximum",
        "max",
        "highest",
        "mayor",
        "maximo",
        "máximo",
    ]);

    const minimum = getValueByKeys(record, [
        "minimum",
        "min",
        "lowest",
        "menor",
        "minimo",
        "mínimo",
    ]);

    const hasAny =
        average !== undefined ||
        median !== undefined ||
        maximum !== undefined ||
        minimum !== undefined;

    if (!hasAny) {
        return null;
    }

    return {
        average,
        median,
        maximum,
        minimum,
    };
}

function findStats(metadata: unknown): FoundStats | null {
    if (!isRecord(metadata)) {
        return null;
    }

    const directStats = getStatPack(metadata);
    if (directStats) {
        return directStats;
    }

    const containerKeys = [
        "stats",
        "numericStats",
        "summaryStats",
        "statistics",
        "kpis",
    ];

    for (const containerKey of containerKeys) {
        const container = metadata[containerKey];
        if (!isRecord(container)) continue;

        const flatStats = getStatPack(container);
        if (flatStats) {
            return flatStats;
        }

        for (const [key, value] of Object.entries(container)) {
            if (!isRecord(value)) continue;

            const nestedStats = getStatPack(value);
            if (nestedStats) {
                return {
                    columnLabel: key,
                    ...nestedStats,
                };
            }
        }
    }

    for (const [key, value] of Object.entries(metadata)) {
        if (!isRecord(value)) continue;

        const nestedStats = getStatPack(value);
        if (nestedStats) {
            return {
                columnLabel: key,
                ...nestedStats,
            };
        }
    }

    return null;
}

const numberFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
});

function formatStatValue(value: unknown): string {
    const parsed = parseNumber(value);

    if (parsed !== null) {
        return numberFormatter.format(parsed);
    }

    if (typeof value === "string" && value.trim()) {
        return value;
    }

    return "N/A";
}

function getFileBadge(fileName?: string): React.ReactNode {
    const ext = fileName?.split(".").pop()?.toUpperCase();

    if (!ext) return <IoDocumentOutline className="h-4 w-4" />;
    if (ext === "XLSX") return <IoDocumentsOutline className="h-4 w-4" />;
    if (ext === "CSV") return <IoListOutline className="h-4 w-4" />;

    return <IoDocumentOutline className="h-4 w-4" />;
}

function buildFallbackCards(file: FileLike): KpiCardData[] {
    const metadata = isRecord(file.metadata) ? file.metadata : null;

    const sheets = metadata && Array.isArray(metadata.sheets)
        ? metadata.sheets.filter(isRecord)
        : [];

    const directRows = metadata
        ? parseNumber(
              getValueByKeys(metadata, [
                  "numberOfRows",
                  "rows",
                  "rowCount",
                  "totalRows",
              ])
          )
        : null;

    const directColumns = metadata
        ? parseNumber(
              getValueByKeys(metadata, [
                  "numberOfColumns",
                  "columns",
                  "columnCount",
                  "totalColumns",
              ])
          )
        : null;

    const rowsFromSheets =
        sheets.length > 0
            ? sheets.reduce((total, sheet) => {
                  const current = parseNumber(sheet.numberOfRows);
                  return total + (current ?? 0);
              }, 0)
            : null;

    const columnsFromSheets =
        sheets.length > 0
            ? sheets.reduce((max, sheet) => {
                  const current = parseNumber(sheet.numberOfColumns) ?? 0;
                  return Math.max(max, current);
              }, 0)
            : null;

    const rows = directRows ?? rowsFromSheets;
    const columns = directColumns ?? columnsFromSheets;
    const sheetCount = sheets.length > 0 ? sheets.length : null;

    return [
        {
            title: "Size",
            value: typeof file.size === "number" ? formatBytes(file.size) : "N/A",
            helper: "File size on disk",
            badge: <IoDocumentOutline className="h-4 w-4" />,
        },
        {
            title: "Rows",
            value: rows !== null ? numberFormatter.format(rows) : "N/A",
            helper: "Detected records",
            badge: <IoListOutline className="h-4 w-4" />,
        },
        {
            title: "Columns",
            value: columns !== null ? numberFormatter.format(columns) : "N/A",
            helper: "Detected fields",
            badge: <IoGridOutline className="h-4 w-4" />,
        },
        {
            title: "Sheets",
            value:
                sheetCount !== null
                    ? numberFormatter.format(sheetCount)
                    : "1",
            helper: "File tabs",
            badge: <IoDocumentsOutline className="h-4 w-4" />,
        },
    ];
}

export default function FileKpiCards({ file }: { file: FileLike }) {
    const stats = findStats(file.metadata);

    const cards: KpiCardData[] = stats
        ? [
              {
                  title: "Average",
                  value: formatStatValue(stats.average),
                  helper: stats.columnLabel
                      ? `Detected column: ${stats.columnLabel}`
                      : "Numeric summary of the file",
                  badge: <IoCalculatorOutline className="h-4 w-4" />,
              },
              {
                  title: "Median",
                  value: formatStatValue(stats.median),
                  helper: stats.columnLabel
                      ? `Detected column: ${stats.columnLabel}`
                      : "Central tendency",
                  badge: <IoStatsChartOutline className="h-4 w-4" />,
              },
              {
                  title: "Maximum",
                  value: formatStatValue(stats.maximum),
                  helper: "Highest detected value",
                  badge: <IoArrowUpCircleOutline className="h-4 w-4" />,
              },
              {
                  title: "Minimum",
                  value: formatStatValue(stats.minimum),
                  helper: "Lowest detected value",
                  badge: <IoArrowDownCircleOutline className="h-4 w-4" />,
              },
          ]
        : buildFallbackCards(file);

    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>File Indicators</h2>
                <p className={styles.sectionSubtitle}>
                    {stats
                        ? "Numeric summary detected automatically"
                        : "Available file metadata"}
                </p>
            </div>

            <div className={styles.grid}>
                {cards.map((card) => (
                    <KpiCard key={card.title} {...card} />
                ))}
            </div>
        </section>
    );
}