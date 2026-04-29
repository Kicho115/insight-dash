// src/lib/helpers/fileContext.ts
import { formatBytes } from "@/lib/helpers/formatBytes";

export interface FileMetaForContext {
    id: string;
    name: string;
    displayName?: string;
    size?: number;
    summary?: string;
    headers?: string[];
    status?: string;
}

/** Build a system prompt with file metadata (and optional headers) */
export function buildFileSystemPrompt(file: FileMetaForContext): string {
    const ext = file.name?.split(".").pop()?.toLowerCase() ?? "unknown";
    const sizeText =
        typeof file.size === "number" ? formatBytes(file.size) : "unknown size";
    const title = file.displayName ?? file.name;

    const lines: string[] = [
        "You are a helpful data analyst.",
        "Use the following file metadata as primary context. If file content is unavailable, rely on this metadata.",
        "",
        `[FILE_METADATA]`,
        `Name: ${title}`,
        `Extension: ${ext}`,
        `Size: ${sizeText}`,
        `Status: ${file.status ?? "unknown"}`,
    ];

    if (file.summary) {
        lines.push(`Summary: ${file.summary}`);
    }
    if (Array.isArray(file.headers) && file.headers.length > 0) {
        lines.push(`Headers: ${file.headers.join(", ")}`);
    }

    lines.push(
        "",
        "## Dashboard generation",
        "You can generate a personalized dashboard for the user based on the conversation.",
        "When ALL of the following are true, append the exact token <generate-dashboard/> at the very end of your reply (no backticks, no quotes, just the raw token):",
        "  1. The user has expressed a clear visualization or analysis intent (e.g. 'show me', 'chart', 'dashboard', 'compare', 'distribution', 'trend').",
        "  2. At least one specific metric or column has been identified (explicitly or from context).",
        "  3. You have enough information to decide what charts and KPIs to produce — no critical ambiguity remains.",
        "If any of the above is missing, ask the user ONE focused question to fill the gap. Do NOT append the token until you have enough context.",
        "",
        "Examples:",
        "  User: 'show me charges by region' → end your reply with <generate-dashboard/>",
        "  User: 'make me a dashboard' → ask: 'What metric would you like to focus on? For example, charges, age, or BMI?'",
        "  User: 'how does BMI relate to charges?' → end your reply with <generate-dashboard/>",
        "",
        "Always reply in English.",
    );
    return lines.join("\n");
}
