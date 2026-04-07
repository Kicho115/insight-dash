import { createContext, useContext, useState, ReactNode } from "react";
import { KpiCardData } from "@/components/KpiCard/KpiCard";

interface DynamicKpiContextType {
    dynamicKpis: KpiCardData[];
    addKpi: (kpi: KpiCardData) => void;
    clearKpis: () => void;
}

const DynamicKpiContext = createContext<DynamicKpiContextType | undefined>(undefined);

export function DynamicKpiProvider({ children }: { children: ReactNode }) {
    const [dynamicKpis, setDynamicKpis] = useState<KpiCardData[]>([]);

    const addKpi = (kpi: KpiCardData) => {
        setDynamicKpis(prev => {
            // Evitar duplicados por título
            const exists = prev.some(existing => existing.title === kpi.title);
            if (exists) {
                // Actualizar el existente
                return prev.map(existing =>
                    existing.title === kpi.title ? kpi : existing
                );
            }
            return [...prev, kpi];
        });
    };

    const clearKpis = () => {
        setDynamicKpis([]);
    };

    return (
        <DynamicKpiContext.Provider value={{ dynamicKpis, addKpi, clearKpis }}>
            {children}
        </DynamicKpiContext.Provider>
    );
}

export function useDynamicKpis() {
    const context = useContext(DynamicKpiContext);
    if (context === undefined) {
        throw new Error("useDynamicKpis must be used within a DynamicKpiProvider");
    }
    return context;
}