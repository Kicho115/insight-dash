

import type { ChatMessage } from "@/lib/helpers/chat";
import { serializeMessages, extractTextFromGenkitResult } from "@/lib/helpers/chat";
import * as genkit from "@/services/genkit";

type AiLike = {
  generate: (args: { prompt: string; model?: unknown }) => Promise<unknown>;
};

function isAiLike(obj: unknown): obj is AiLike {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "generate" in (obj as Record<string, unknown>) &&
    typeof (obj as { generate: unknown }).generate === "function"
  );
}

/**
 * Try to pick a model out of the genkit module in a safe way.
 */
function pickModel(mod: unknown): unknown | undefined {
  if (typeof mod !== "object" || mod === null) return undefined;
  const rec = mod as Record<string, unknown>;
  if ("model" in rec) return rec.model;
  if ("defaultModel" in rec) return rec.defaultModel;
  if ("getModel" in rec && typeof rec.getModel === "function") {
    try {
      return (rec.getModel as () => unknown)();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export interface AskAIInput {
  messages: ChatMessage[];
}

/**
 * Ask the configured Genkit model to respond to the provided messages.
 * @param input - chat messages (system/user/assistant)
 * @returns an object with a normalized { content: string }
 */
export async function askAI(input: AskAIInput): Promise<{ content: string }> {
  const ai: unknown = (genkit as Record<string, unknown>).ai;
  if (!isAiLike(ai)) {
    throw new Error("Genkit 'ai' is not configured.");
  }

  const model = pickModel(genkit);
  const prompt = serializeMessages(input.messages);

  const result =
    model !== undefined
      ? await ai.generate({ model, prompt })
      : await ai.generate({ prompt });

  const content = extractTextFromGenkitResult(result);
  return { content };
}
