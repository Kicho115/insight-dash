import type { ChatMessage } from "@/lib/helpers/chat";


export interface AskAiInput {
  messages: ChatMessage[];
  options?: Record<string, unknown>;
}


export interface AskAiSuccess {
  success: true;
  data: unknown; 
}


export interface AskAiError {
  success: false;
  error: string;
}

export type AskAiResult = AskAiSuccess | AskAiError;


export async function askAi(input: AskAiInput): Promise<AskAiResult> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  try {
    const json = (await res.json()) as AskAiResult;
    return json;
  } catch {
    return { success: false, error: "Invalid JSON from /api/ai" };
  }
}
