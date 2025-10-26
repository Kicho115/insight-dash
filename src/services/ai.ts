import type { ChatMessage } from "@/lib/helpers/chat";

export interface AskAiRequest {
  messages: ChatMessage[];
  options?: Record<string, unknown>;
}

export interface AskAiSuccess {
  success: true;
  data: { content: string };
}

export interface AskAiFailure {
  success: false;
  error: string;
}

export type AskAiResponse = AskAiSuccess | AskAiFailure;

/** Call the internal API to ask the model. */
export async function askAi(input: AskAiRequest): Promise<AskAiResponse> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  try {
    return (await res.json()) as AskAiResponse;
  } catch {
    return { success: false, error: "Invalid JSON from /api/ai" };
  }
}
