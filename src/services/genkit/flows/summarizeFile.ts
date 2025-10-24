"use server";

/**
 * @file This file contains a flow definition for generating a summary of a file.
 * @module services/genkit/flows/summarizeFile
 */

import { z } from "genkit";
import { ai } from "@/services/genkit";

// Define the schema for the input
const inputSchema = z.object({
    fileName: z.string().min(1, "File name cannot be empty"),
    columnHeaders: z
        .array(z.string().min(1))
        .min(1, "At least one column header is required"),
});

// Define the schema for the output
const outputSchema = z.object({
    summary: z.string(),
});

// Define the flow
export const summarizeFileFlow = ai.defineFlow(
    {
        name: "summarizeFile",
        inputSchema: inputSchema,
        outputSchema: outputSchema,
    },
    async (input) => {
        const systemPrompt = `
Task: Generate a high-level summary of a dataset's purpose.

Context: You are a component in an automated data processing pipeline. You will be provided with a file name and a list of column headers from a CSV or Excel file. Your sole function is to return a concise summary paragraph.

Instructions:
1. Analyze the provided **file name** and **column headers** to infer the dataset's content and potential use case.
2. Your output must be a single, direct paragraph of 2 to 3 sentences.
3. The summary should describe what the data represents and its likely business purpose.
4. **Do not** include any introductory phrases, greetings, or conversational text (e.g., do not start with "This file contains..." or "The summary is..."). Output only the summary itself.
5. Base the summary **exclusively** on the metadata provided. Do not invent information.

---

### Example

**PROVIDED INPUT:**

* **File Name:** \`employee_annual_perf_review_fy2024.xlsx\`
* **Column Headers:** \`['EmployeeID', 'FirstName', 'LastName', 'Department', 'ManagerID', 'ReviewDate', 'OverallRating', 'Comments']\`

**EXPECTED OUTPUT:**

This dataset tracks annual employee performance reviews for the 2024 fiscal year. It includes employee identification, departmental information, review dates, and quantitative performance ratings, likely used by HR and management for talent assessment and planning.
`;

        const prompt = `
        ${systemPrompt}
        ### PROVIDED INPUT:
        * File Name: \`${input.fileName}\`
        * Column Headers: \`${JSON.stringify(input.columnHeaders)}\``;

        const { output } = await ai.generate({
            prompt,
            output: { schema: outputSchema },
        });

        if (!output) throw new Error("Failed to generate an answer");
        return output;
    }
);
