// src/lib/helpers/fileContext.ts
import { formatBytes } from "@/lib/helpers/formatBytes";

type Maybe<T> = T | null | undefined;

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
  const sizeText = typeof file.size === "number" ? formatBytes(file.size) : "unknown size";
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

  lines.push("", "Always reply in English.");
  return lines.join("\n");
}
