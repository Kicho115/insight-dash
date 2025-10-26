import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in .env.local");
}

export const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";


export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: GEMINI_API_KEY,
    }),
  ],
});
