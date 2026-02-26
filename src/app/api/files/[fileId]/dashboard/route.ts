import { NextRequest, NextResponse } from "next/server";
import { codeExecutionFlow } from "@/services/genkit/flows/codeExecution";

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();

        if (!prompt || typeof prompt !== "string") {
            return NextResponse.json(
                { error: "prompt is required" },
                { status: 400 },
            );
        }

        const result = await codeExecutionFlow({ prompt });

        return NextResponse.json(result);
    } catch (error) {
        console.error("[dashboard/route] error:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Internal server error",
            },
            { status: 500 },
        );
    }
}
