"use server";

/**
 * @file This file contains a flow definition for identifying the headers row from multiple rows from a csv or xlsx file.
 * @module services/genkit/flows/getHeaders
 */

import { z } from "genkit";
import { ai } from "@/services/genkit";

// Define the schema for the input
const inputSchema = z
    .array(z.string().min(1))
    .min(1, "At least one column header is required");

// Define the schema for the output
const outputSchema = z.array(z.string());

// Define the flow
export const getHeadersFlow = ai.defineFlow(
    {
        name: "getHeadersFromFile",
        inputSchema: inputSchema,
        outputSchema: outputSchema,
    },
    async (input) => {
        const systemPrompt = `
Task: Identify and extract the row that contains the column headers from the provided data.

Instructions:
1. Analyze all the provided rows carefully
2. Identify which row contains the actual column headers (typically descriptive labels rather than data values)
3. Column headers usually:
   - Are descriptive text (e.g., "Name", "Date", "Amount", "Customer ID")
   - Appear before the actual data rows
   - Don't contain purely numeric values or dates as data
   - May be followed by rows with corresponding data values
4. Return ONLY the column names from the identified header row — never include data values
5. Preserve the exact text of the headers as they appear
6. If multiple rows could be headers, choose the most descriptive one
7. CRITICAL: There is always exactly ONE header row. The output array must contain exactly one string per column. For a file with a single column, return exactly one string. Data values (e.g. country names under a "Country" column) must never appear in your response.

Return the column headers as an array of strings.`;

        const prompt = `
        ${systemPrompt}
        ### PROVIDED INPUT:
        * Rows from file: \`${JSON.stringify(input)}\`
        
        Identify and return the column headers.`;

        const { output } = await ai.generate({
            prompt,
            output: { schema: outputSchema },
        });

        if (!output) throw new Error("Failed to generate an answer");
        return output;
    }
);
