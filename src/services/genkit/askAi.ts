// src/services/genkit/askAi.ts
import { ai, model } from "./index";          
import type { ChatMessage } from "@/lib/helpers/chat";

export interface AskAIInput {
  messages: ChatMessage[];
  preamble?: string;
  temperature?: number;
}

export interface AskAIOutput {
  content: string;
}

/**
 * Thin Genkit wrapper to generate a response from a chat history.
 * Serializes messages into a single prompt (no tools, no streaming).
 */
export async function askAI({
  messages,
  preamble,
  temperature = 0.7,
}: AskAIInput): Promise<AskAIOutput> {
  const parts: string[] = [];

  if (preamble && preamble.trim().length > 0) {
    parts.push(preamble.trim());
  }

  for (const m of messages) {
    const tag = m.role === "assistant" ? "ASSISTANT" : m.role.toUpperCase();
    parts.push(`${tag}: ${m.content}`);
  }

  parts.push("ASSISTANT:");
  const prompt = parts.join("\n\n");

  const result = await ai.generate({
    model,                                 
    prompt,
    config: { temperature },
  });


  const text = (result as { text?: string }).text ?? "";

  return { content: text };
}
