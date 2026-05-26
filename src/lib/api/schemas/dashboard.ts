import { z } from "zod";

export const kpiFormatSchema = z.enum(["number", "currency", "percentage"]);

export const chartTypeSchema = z.enum(["bar", "line", "pie", "area"]);

export const kpiSchema = z
    .object({
        id: z.string().min(1),
        label: z.string().min(1),
        value: z.coerce.number(),
        format: kpiFormatSchema.optional(),
        helper: z.string().optional(),
    })
    .strict();

export const chartYKeySchema = z
    .object({
        key: z.string().min(1),
        label: z.string().min(1),
        color: z.string().min(1).optional(),
    })
    .strict();

export const chartSchema = z
    .object({
        id: z.string().min(1),
        type: chartTypeSchema,
        title: z.string().min(1),
        data: z.array(z.record(z.string(), z.unknown())),
        xKey: z.string().min(1),
        yKeys: z.array(chartYKeySchema),
    })
    .strict();

export const dashboardSchema = z
    .object({
        title: z.string().min(1).optional(),
        kpis: z.array(kpiSchema),
        charts: z.array(chartSchema),
    })
    .strict();

export const createDashboardSchema = dashboardSchema;

export type KPIFormat = z.infer<typeof kpiFormatSchema>;
export type ChartType = z.infer<typeof chartTypeSchema>;
export type KPI = z.infer<typeof kpiSchema>;
export type Chart = z.infer<typeof chartSchema>;
export type Dashboard = z.infer<typeof dashboardSchema>;
export type CreateDashboardInput = z.infer<typeof createDashboardSchema>;
