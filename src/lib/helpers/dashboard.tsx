import type { KPI, KPIFormat } from "@/types/dashboard";
import {
    IoCalculatorOutline,
    IoCashOutline,
    IoStatsChartOutline,
} from "react-icons/io5";

export function formatKpiValue(kpi: KPI): string {
    const value = typeof kpi.value === "number" ? kpi.value : Number(kpi.value);

    if (!Number.isFinite(value)) {
        return String(kpi.value);
    }

    if (kpi.format === "currency") {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 2,
        }).format(value);
    }

    if (kpi.format === "percentage") {
        const ratio = value > 1 ? value / 100 : value;
        return new Intl.NumberFormat("en-US", {
            style: "percent",
            maximumFractionDigits: 2,
        }).format(ratio);
    }

    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
    }).format(value);
}

export function kpiBadge(format: KPIFormat | undefined): React.ReactNode {
    if (format === "currency") return <IoCashOutline className="h-4 w-4" />;
    if (format === "percentage")
        return <IoStatsChartOutline className="h-4 w-4" />;
    return <IoCalculatorOutline className="h-4 w-4" />;
}
