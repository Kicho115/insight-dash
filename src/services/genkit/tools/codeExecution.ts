import { z } from "genkit";
import { ai } from "@/services/genkit";
import { Sandbox } from "@e2b/code-interpreter";

// Define tool for code execution
export const executeCodeTool = ai.defineTool(
    {
        name: "execute_python_code",
        description:
            "Execute python code in a Jupyter notebook cell and return results.",
        inputSchema: z.object({
            code: z
                .string()
                .describe(
                    "The python code to execute in a singular Jupyter notebook cell.",
                ),
        }),
        outputSchema: z.string().describe("The output from the executed code."),
    },
    async (input) => {
        let sbx: Sandbox | undefined;

        try {
            sbx = await Sandbox.create();
        } catch (err) {
            return `Error: Failed to create sandbox environment: ${err instanceof Error ? err.message : String(err)}`;
        }

        try {
            const execution = await sbx.runCode(input.code, {
                timeoutMs: 30000,
            });

            const output =
                execution.text ||
                (execution.logs.stdout.length > 0
                    ? execution.logs.stdout.join("\n")
                    : null) ||
                (execution.logs.stderr.length > 0
                    ? execution.logs.stderr.join("\n")
                    : null) ||
                "No output";

            return `The output from the executed code is: ${output}`;
        } catch (err) {
            return `Error: Code execution failed: ${err instanceof Error ? err.message : String(err)}`;
        } finally {
            await sbx?.kill().catch(() => {});
        }
    },
);
