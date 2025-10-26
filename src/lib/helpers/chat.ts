export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** Turn a chat history into a single plain prompt string. */
export function serializeMessages(messages: ChatMessage[]): string {
  return messages
    .map((m) => {
      const tag = m.role.toUpperCase();
      return `${tag}: ${m.content}`;
    })
    .join("\n\n");
}

/** Try to extract a human-readable answer from a Genkit generate() result. */
export function extractTextFromGenkitResult(result: unknown): string {
  if (typeof result === "string") return result;

  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;

    if (typeof r["text"] === "string") return r["text"] as string;
    if (typeof r["outputText"] === "string") return r["outputText"] as string;

    const message = r["message"];
    if (message && typeof message === "object") {
      const content = (message as Record<string, unknown>)["content"];
      if (Array.isArray(content) && content.length > 0) {
        const first = content[0] as Record<string, unknown>;
        if (typeof first["text"] === "string") return first["text"] as string;
      }
    }

    const data = r["data"];
    if (typeof data === "string") return data;
  }

  return "No content.";
}
