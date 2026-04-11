"use server";

import { z } from "genkit";
import { ai } from "@/services/genkit";
import { Sandbox } from "@e2b/code-interpreter";
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

function extractPythonCode(text: string): string {
    const fenced = text.match(/```(?:python)?\s*([\s\S]*?)```/i);
    if (fenced) return fenced[1].trim();
    return text.trim();
}

export async function generateConversationalDashboardFlow(
    input: ConversationalDashboardInput,
) {
    const filePath = `/home/user/data.${input.fileExtension}`;
    const conversationText = serializeMessages(
        input.conversationHistory
            .filter((m) => m.role !== "system")
            .slice(-10),
    );

    let sbx: Sandbox | undefined;

    try {
        sbx = await Sandbox.create({ timeoutMs: 120_000 });
        await sbx.files.write(filePath, input.fileBuffer);

        // Step 1: AI writes Python code based on the conversation (plain text — no tools)
        const codeResult = await ai.generate({
            prompt: `
You are a data analyst. Write Python code using pandas to compute the exact metrics requested in this conversation.

## File information
- File path: ${filePath}
- Column headers: ${JSON.stringify(input.headers)}
- Summary: ${input.summary}

## Conversation history
${conversationText}

## Instructions
Write a single self-contained Python script that:
1. Loads the file from \`${filePath}\` using pandas (use pd.read_csv or pd.read_excel based on the extension).
2. Computes the exact KPIs and chart data the user requested:
   - KPIs: print a labeled line per value, e.g. "avg_charges_smokers: 32050.23"
   - Charts: print each dataset as a labeled JSON array, e.g. "chart_region_charges: [{'region': 'NE', 'charges': 12000}, ...]"
3. Prints all results clearly so they can be parsed.

Return ONLY the Python code, no explanation.
`,
        });

        const pythonCode = extractPythonCode(codeResult.text ?? "");

        if (!pythonCode) {
            throw new Error("AI did not generate Python code.");
        }

        // Step 2: Execute the code directly in E2B (no Genkit tools)
        const execution = await sbx.runCode(pythonCode, { timeoutMs: 30_000 });

        const computedData = (
            execution.text ||
            execution.logs.stdout.join("\n") ||
            execution.logs.stderr.join("\n")
        ).trim();

        if (!computedData) {
            throw new Error("Python script produced no output. Check the generated code.");
        }

        // Step 3: Format computed data into Dashboard JSON (structured output, no tools)
        const { output } = await ai.generate({
            prompt: `
Convert the following computed data into a dashboard JSON object.
Use ONLY the values present in the computed data — do not invent or substitute metrics.

## Computed data
${computedData}

## Column headers available
${JSON.stringify(input.headers)}

## Rules
- title: short human-readable dashboard name derived from the data topic.
- kpis: one item per computed KPI value. Do not add KPIs not present in the data.
  Fields: id (kebab-case), label, value (exact computed number), format ("currency"|"percentage"|"number"), helper (under 6 words).
- charts: one item per computed chart dataset. Do not add charts not present in the data.
  Fields: id (kebab-case), type ("bar"|"line"|"pie"|"area"), title, data (exact rows, max 20 for bar/pie, 40 for line/area), xKey, yKeys ([{ key, label }]).
- xKey and yKeys[].key must exactly match the provided column headers.
- format: "currency" for charges/cost/revenue, "percentage" for rates, "number" otherwise.
`,
            output: { schema: dashboardSchema },
        });

        if (!output) throw new Error("AI did not return a dashboard structure.");
        return output;

    } finally {
        await sbx?.kill().catch(() => {});
    }
}
