import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) throw new Error("Falta GEMINI_API_KEY en .env.local");

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

type Role = "system" | "user" | "assistant";
export type AIMessage = { role: Role; content: string };

interface AskAIInput {
  messages: AIMessage[];
  fileIds?: string[];
}

export async function askAI({ messages, fileIds = [] }: AskAIInput) {
  const genAI = new GoogleGenerativeAI(API_KEY!);
  const model = genAI.getGenerativeModel({ model: MODEL });

  // 1) Separa system prompts de la historia
  const systemPrompts = messages.filter(m => m.role === "system").map(m => m.content);
  const nonSystem = messages.filter(m => m.role !== "system");

  // 2) Construye history para chat.start
  //    La SDK usa roles "user" | "model"
  const history = nonSystem.slice(0, -1).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // 3) Prompt adicional para contexto del archivo (si solo quieres “hint”)
  const fileHint =
    fileIds.length > 0
      ? `\n\n[contexto_archivo]\nTrabaja con el/los archivo(s) id=${fileIds.join(", ")}.\n`
      : "";

  const sys = systemPrompts.join("\n\n");
  const last = nonSystem.at(-1)?.content || "";

  const preamble =
    (sys ? sys + "\n\n" : "") +
    "Estilo: responde de forma clara y accionable. Formato markdown válido." +
    fileHint;

  // 4) Inicia chat con historia y envía sólo el último user
  const chat = model.startChat({
    history: [
      // Inyecta un "system" implícito como primer mensaje de usuario
      ...(preamble
        ? [{ role: "user" as const, parts: [{ text: preamble }] }]
        : []),
      ...history,
    ],
  });

  const res = await chat.sendMessage(last);
  const text = res.response?.text?.() ?? "";
  return { content: text };
}
