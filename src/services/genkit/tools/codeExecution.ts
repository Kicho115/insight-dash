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
        const sbx = await Sandbox.create();
        const execution = await sbx.runCode(input.code);

        const output =
            execution.text ??
            execution.logs.stdout.join("\n") ??
            execution.logs.stderr.join("\n") ??
            "No output";

        return `The output from the executed code is: ${output}`;
    },
);
