import { NextRequest, NextResponse } from "next/server";
import { codeExecutionFlow } from "@/services/genkit/flows/codeExecution";
import { requireServerAuth } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
    try {
        await requireServerAuth();

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
        if ((error as Error).message === "Authentication required") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }
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
