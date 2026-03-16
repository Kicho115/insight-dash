"use server";

import { z } from "genkit";
import { ai } from "@/services/genkit";
import { executeCodeTool } from "@/services/genkit/tools/codeExecution";

// Define the schema for the input
const inputSchema = z.object({
    prompt: z.string().min(1, "Prompt cannot be empty"),
});

// Define the schema for the output
const outputSchema = z.object({
    result: z.string(),
});

export const codeExecutionFlow = ai.defineFlow(
    {
        name: "codeExecutionFlow",
        inputSchema: inputSchema,
        outputSchema: outputSchema,
    },
    async (input) => {
        // Simulate code execution
        const { output } = await ai.generate({
            prompt: input.prompt,
            output: { schema: outputSchema },
            tools: [executeCodeTool],
        });

        if (!output) throw new Error("Failed to generate an answer");
        return output;
    },
);
