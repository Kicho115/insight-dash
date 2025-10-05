// src/services/genkit/askAi.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Falta GEMINI_API_KEY en el entorno (.env.local)");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function askAI({ question }: { question: string }) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(question);
  const text = result.response?.text?.() ?? "";
  return { content: text };
}
