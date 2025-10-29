// src/services/ai.ts
import type { ChatMessage } from "@/lib/helpers/chat";

export interface AskAiRequest {
  messages: ChatMessage[];
  fileId?: string;
  options?: {
    temperature?: number;
  };
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
