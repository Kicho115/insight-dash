import { z } from "genkit";
import { ai } from "@/services/genkit";
import { Sandbox } from "@e2b/code-interpreter";

/**
 * Returns a Genkit tool that executes Python code in an existing E2B sandbox
 * identified by `sbxId`. The sandbox is never destroyed by the tool — the
 * caller is responsible for cleanup.
 */
export function createSharedSandboxTool(sbxId: string) {
    return ai.defineTool(
        {
            name: "execute_python_code",
            description:
                "Execute Python code in a persistent Jupyter notebook cell and return the output. The file is already loaded at /home/user/data.csv (or .xlsx). Use pandas for data manipulation.",
            inputSchema: z.object({
                code: z.string().describe("Python code to execute."),
            }),
            outputSchema: z
                .string()
                .describe("Output from the executed code."),
        },
        async (input) => {
            let sbx: Sandbox;
            try {
                sbx = await Sandbox.connect(sbxId);
            } catch (err) {
                return `Error: Failed to connect to sandbox: ${err instanceof Error ? err.message : String(err)}`;
            }

            try {
                const execution = await sbx.runCode(input.code, {
                    timeoutMs: 30_000,
                });

                return (
                    execution.text ||
                    (execution.logs.stdout.length > 0
                        ? execution.logs.stdout.join("\n")
                        : null) ||
                    (execution.logs.stderr.length > 0
                        ? execution.logs.stderr.join("\n")
                        : null) ||
                    "No output"
                );
            } catch (err) {
                return `Error: Code execution failed: ${err instanceof Error ? err.message : String(err)}`;
            }
        },
    );
}
