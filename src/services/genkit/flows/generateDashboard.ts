"use server";

/**
 * @file Genkit flow that analyzes file metadata and returns a structured Dashboard.
 * @module services/genkit/flows/generateDashboard
 */

import { z } from "genkit";
import { ai } from "@/services/genkit";

// Output schema redefined with Genkit's z to avoid Zod instance mismatch
const kpiFormatSchema = z.enum(["number", "currency", "percentage"]);
const chartTypeSchema = z.enum(["bar", "line", "pie", "area"]);
const kpiSchema = z.object({
    id: z.string(),
    label: z.string(),
    value: z.number(),
    format: kpiFormatSchema.optional(),
    helper: z.string().optional(),
});
const chartYKeySchema = z.object({
    key: z.string(),
    label: z.string(),
    color: z.string().optional(),
});
const chartSchema = z.object({
    id: z.string(),
    type: chartTypeSchema,
    title: z.string(),
    data: z.array(z.record(z.string(), z.unknown())),
    xKey: z.string(),
    yKeys: z.array(chartYKeySchema),
});
const dashboardSchema = z.object({
    title: z.string().optional(),
    kpis: z.array(kpiSchema),
    charts: z.array(chartSchema),
});

const inputSchema = z.object({
    fileName: z.string().min(1, "File name cannot be empty"),
    headers: z
        .array(z.string().min(1))
        .min(1, "At least one column header is required"),
    summary: z.string().min(1, "Summary cannot be empty"),
    rowCount: z.number().int().positive().optional(),
});

export const generateDashboardFlow = ai.defineFlow(
    {
        name: "generateDashboard",
        inputSchema,
        outputSchema: dashboardSchema,
    },
    async (input) => {
        const rowCountLine = input.rowCount
            ? `- Row count: ${input.rowCount.toLocaleString()}`
            : "";

        const systemPrompt = `
Task: Design a dashboard layout based on a dataset's metadata.

Context: You are a data analyst assistant. You will receive a file name, column headers, and a summary of a dataset. Your job is to decide which KPIs and charts best represent this data.

You do NOT have access to the actual data rows — only the metadata. Follow these rules strictly:

**KPI rules:**
- Select 3 to 5 columns that likely contain numeric or aggregatable values (e.g. revenue, count, total, rate, score).
- Set \`value\` to \`0\` as a placeholder — real values will be computed later.
- Set \`format\` based on the column name: use "currency" for price/revenue/cost/sales/amount, "percentage" for rate/ratio/pct/percent, "number" for everything else.
- Set \`helper\` to a short phrase (under 6 words) describing what the KPI measures (e.g., "Total revenue across all sales", "Average customer satisfaction score").
- Generate a unique \`id\` in kebab-case (e.g., "kpi-total-revenue").

**Chart rules:**
- Select 2 to 3 charts that would meaningfully visualize the data.
- Use "line" or "area" for time-series columns (date/month/year/week/period).
- Use "bar" for categorical comparisons (region/department/category/product).
- Use "pie" for proportional breakdowns with few categories (up to 5).
- Set \`data\` to an empty array \`[]\` — real data will be filled in later.
- \`xKey\` must be the name of the column to use as the X axis (dimension).
- \`yKeys\` must reference column names that contain numeric values.
- Generate a unique \`id\` in kebab-case (e.g., "chart-sales-by-region").

**General rules:**
- The dashboard \`title\` should be a short, human-readable name derived from the file name.
- All \`id\`, \`key\`, and \`xKey\` values must exactly match the column headers provided.
- Do not invent column names that are not in the provided headers.

---

### Example

**PROVIDED INPUT:**

- File name: \`employee_annual_perf_review_fy2024.xlsx\`
- Column headers: \`["EmployeeID", "Department", "ReviewDate", "OverallRating", "Salary", "BonusPct"]\`
- Summary: Dataset tracking annual employee performance reviews for FY2024.

**EXPECTED OUTPUT:**

\`\`\`json
{
  "title": "Employee Performance FY2024",
  "kpis": [
    { "id": "kpi-avg-rating", "label": "Avg. Overall Rating", "value": 0, "format": "number", "helper": "Mean rating across all employees" },
    { "id": "kpi-avg-salary", "label": "Avg. Salary", "value": 0, "format": "currency", "helper": "Average annual compensation" },
    { "id": "kpi-avg-bonus", "label": "Avg. Bonus %", "value": 0, "format": "percentage", "helper": "Average bonus percentage awarded" }
  ],
  "charts": [
    {
      "id": "chart-rating-by-department",
      "type": "bar",
      "title": "Avg. Rating by Department",
      "data": [],
      "xKey": "Department",
      "yKeys": [{ "key": "OverallRating", "label": "Overall Rating" }]
    },
    {
      "id": "chart-salary-by-department",
      "type": "bar",
      "title": "Avg. Salary by Department",
      "data": [],
      "xKey": "Department",
      "yKeys": [{ "key": "Salary", "label": "Salary" }]
    }
  ]
}
\`\`\`
`;

        const prompt = `
${systemPrompt}

### PROVIDED INPUT:

- File name: \`${input.fileName}\`
- Column headers: \`${JSON.stringify(input.headers)}\`
- Summary: ${input.summary}
${rowCountLine}
`;

        const { output } = await ai.generate({
            prompt,
            output: { schema: dashboardSchema },
        });

        if (!output) throw new Error("Failed to generate dashboard structure");
        return output;
    },
);
