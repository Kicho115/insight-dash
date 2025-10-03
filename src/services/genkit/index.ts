import { googleAI } from "@genkit-ai/google-genai";
import { genkit } from "genkit";

// Initialize Genkit with the Google AI plugin
// GEMINI_API_KEY must be set in your environment variables
export const ai = genkit({
    plugins: [googleAI()],
    model: googleAI.model("gemini-2.5-flash", {
        temperature: 0.7,
    }),
});
