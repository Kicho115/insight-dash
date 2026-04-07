"use server";

import { z } from "genkit";
import { ai } from "@/services/genkit";
import { Sandbox } from "@e2b/code-interpreter";
import { createSharedSandboxTool } from "@/services/genkit/tools/sharedSandboxExecution";
import type { ChatMessage } from "@/lib/helpers/chat";
import { serializeMessages } from "@/lib/helpers/chat";

// Mirror the dashboard schema using Genkit's z to avoid Zod instance mismatch
const kpiFormatSchema = z.enum(["number", "currency", "percentage"]);
const chartTypeSchema = z.enum(["bar", "line", "pie", "area"]);

const kpiSchema = z.object({
    id: z.string(),
    label: z.string(),
    value: z.union([z.string(), z.number()]),
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

export interface ConversationalDashboardInput {
    fileName: string;
    fileExtension: string;
    fileBuffer: ArrayBuffer;
    headers: string[];
    summary: string;
    conversationHistory: ChatMessage[];
}

export async function generateConversationalDashboardFlow(
    input: ConversationalDashboardInput,
) {
    const filePath = `/home/user/data.${input.fileExtension}`;
    const conversationText = serializeMessages(
        input.conversationHistory.filter((m) => m.role !== "system"),
    );

    let sbx: Sandbox | undefined;

    try {
        sbx = await Sandbox.create({ timeoutMs: 120_000 });

        // Upload the file to the sandbox
        await sbx.files.write(filePath, input.fileBuffer);

        const sandboxTool = createSharedSandboxTool(sbx.sandboxId);

        // Step 1: let the AI use the sandbox freely to compute the data
        const computePrompt = `
You are a data analyst. Your job is to compute the metrics needed for a dashboard based on a user conversation.

## File information
- File name: ${input.fileName}
- File path in sandbox: ${filePath}
- Column headers: ${JSON.stringify(input.headers)}
- Summary: ${input.summary}

## Conversation history
${conversationText}

## Your task
Use the execute_python_code tool to:
1. Load the file from \`${filePath}\` using pandas.
2. Compute the exact metrics and aggregations the user requested in the conversation.
   - For KPIs: single numeric values (totals, averages, counts, etc.)
   - For charts: grouped/aggregated data as a list of records
3. Print all results clearly labeled, so they can be used to build the dashboard.

Be thorough — compute everything needed for 3–5 KPIs and 2–3 charts.
`;

        const computeResult = await ai.generate({
            prompt: computePrompt,
            tools: [sandboxTool],
        });

        const computedData = computeResult.text ?? "";

        // Step 2: format the computed data into a structured Dashboard JSON
        const formatPrompt = `
You are a data analyst. Convert the following computed data into a dashboard JSON object.

## Computed data
${computedData}

## Column headers available
${JSON.stringify(input.headers)}

## Dashboard JSON rules
- \`title\`: short human-readable name for this dashboard.
- \`kpis\`: array of 3–5 objects with real numeric values (not 0 or null).
  - \`id\`: kebab-case string
  - \`label\`: human-readable label
  - \`value\`: the actual computed number
  - \`format\`: "currency" for price/cost/revenue/charges, "percentage" for rates, "number" for everything else
  - \`helper\`: short phrase under 6 words describing what it measures
- \`charts\`: array of 2–3 chart objects with real data rows.
  - \`id\`: kebab-case string
  - \`type\`: "bar" | "line" | "pie" | "area"
  - \`title\`: human-readable chart title
  - \`data\`: array of row objects with real values (max 20 rows for bar/pie, 40 for line/area)
  - \`xKey\`: must exactly match one of the column headers
  - \`yKeys\`: array of { key, label } where key exactly matches a column header

Return ONLY the raw JSON object. No markdown, no explanation, no code fences.
`;

        const { output } = await ai.generate({
            prompt: formatPrompt,
            output: { schema: dashboardSchema },
        });

        if (!output) throw new Error("AI did not return a dashboard structure.");

        return output;
    } finally {
        await sbx?.kill().catch(() => {});
    }
}
