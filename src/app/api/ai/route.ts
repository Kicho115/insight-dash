import { NextResponse } from "next/server";
import { askAI } from "@/services/genkit/askAi";
import type { ChatMessage } from "@/lib/helpers/chat";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: ChatMessage[]; options?: unknown };

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing 'messages' (non-empty array)." },
        { status: 400 }
      );
    }

    const data = await askAI({ messages: body.messages });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
