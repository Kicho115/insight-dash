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

        const prompt = `
You are a data analyst generating a personalized dashboard based on a user conversation.

## File information
- File name: ${input.fileName}
- File path in sandbox: ${filePath}
- Column headers: ${JSON.stringify(input.headers)}
- Summary: ${input.summary}

## Conversation history
${conversationText}

## Your task
1. Use the execute_python_code tool to load the file with pandas and compute the exact metrics the user requested.
   - For KPIs: single numeric values (totals, averages, counts, etc.)
   - For charts: grouped/aggregated data as lists of records
   - Print results clearly so you can read them back
2. After computing, respond with ONLY a raw JSON object (no markdown, no code fences) matching this schema:
   {
     "title": string,
     "kpis": [{ "id": kebab-case, "label": string, "value": number, "format": "number"|"currency"|"percentage", "helper": string (under 6 words) }],
     "charts": [{ "id": kebab-case, "type": "bar"|"line"|"pie"|"area", "title": string, "data": [...real rows...], "xKey": string, "yKeys": [{ "key": string, "label": string }] }]
   }

Rules:
- 3–5 KPIs with real computed values (not 0).
- 2–3 charts with real data rows (max 20 for bar/pie, 40 for line/area).
- xKey and yKeys[].key must exactly match the provided column headers.
- format: "currency" for charges/cost/revenue, "percentage" for rates, "number" otherwise.
- Your final message must be ONLY the JSON object — nothing else.
`;

        const result = await ai.generate({
            prompt,
            tools: [sandboxTool],
        });

        const text = (result.text ?? "").trim();

        // Strip accidental markdown fences if the model adds them
        const json = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

        const parsed = JSON.parse(json);
        return dashboardSchema.parse(parsed);
    } finally {
        await sbx?.kill().catch(() => {});
    }
}
