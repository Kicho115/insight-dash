// This file defines a basic flow that asks an AI a question and returns the answer for rafita :v.

import { z } from "genkit";
import { ai } from "../index";

// Define the schema for the input
const inputSchema = z.object({
    question: z.string().min(1, "Question cannot be empty"),
});

// Define the schema for the output
const outputSchema = z.object({
    answer: z.string(),
});

// Define the flow
export const askAiFlow = ai.defineFlow(
    {
        name: "askAi",
        inputSchema: inputSchema,
        outputSchema: outputSchema,
    },
    async (input) => {
        const prompt = `You are a clown. Respond to the user's question in a funny and engaging way.`;

        const { output } = await ai.generate({
            prompt,
            output: { schema: outputSchema },
        });

        if (!output) throw new Error("Failed to generate an answer");
        return output;
    }
);
