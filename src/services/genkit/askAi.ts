import { ai, model } from "@/services/genkit";
import type { ChatMessage } from "@/lib/helpers/chat";

export interface AskAIInput {
  messages: ChatMessage[];
}


export async function askAI({ messages }: AskAIInput): Promise<{ content: string }> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const prompt = lastUser?.content?.trim() ?? "";

  if (!prompt) {
    return { content: "Please type a message." };
  }

  const result = await ai.generate({ model, prompt });
 
  const content =
    typeof result === "string"
      ? result
      : (typeof (result as any)?.text === "string" ? (result as any).text : "No content.");

  return { content };
}
