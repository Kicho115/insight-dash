import { NextResponse } from "next/server";
// ✅ corrige el import al path real:
import { askAI } from "@/services/genkit/askAi";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Tu flow de Genkit (askAI) en /services/genkit/askAi.ts
    // En tu askAi.ts el input esperado es { question: string }.
    const question =
      body?.question ??
      (Array.isArray(body?.messages)
        ? body.messages.map((m: any) => m.content).join("\n\n")
        : "");

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { success: false, error: "Falta 'question' (string)." },
        { status: 400 }
      );
    }

    // Llama tu flow interno
    const data = await askAI({ question });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("AI route error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
