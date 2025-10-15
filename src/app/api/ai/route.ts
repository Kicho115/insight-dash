import { NextResponse } from "next/server";
import { askAI } from "@/services/genkit/askAi";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Soporta { messages, fileIds } y, si viene sólo question, lo adaptamos
    const messages = Array.isArray(body?.messages)
      ? body.messages
      : body?.question
        ? [{ role: "user", content: String(body.question) }]
        : [];

    const fileIds = Array.isArray(body?.fileIds) ? body.fileIds : [];

    if (!messages.length) {
      return NextResponse.json(
        { success: false, error: "Faltan 'messages' (historial) o 'question'." },
        { status: 400 }
      );
    }

    const data = await askAI({ messages, fileIds }); // <- lo implementamos abajo
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("AI route error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
