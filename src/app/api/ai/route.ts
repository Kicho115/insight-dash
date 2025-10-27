// src/app/api/ai/route.ts
import { NextResponse } from "next/server";
import type { ChatMessage } from "@/lib/helpers/chat";
import { askAI } from "@/services/genkit/askAi";
import { requireServerAuth } from "@/lib/serverAuth";
import { getFileById } from "@/data/files";
import { buildFileSystemPrompt } from "@/lib/helpers/fileContext";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { messages?: ChatMessage[]; fileId?: string };

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing 'messages' (non-empty array)." },
        { status: 400 }
      );
    }

    let preamble: string | undefined;

    if (body.fileId) {
      try {
        const user = await requireServerAuth();
        const file = await getFileById(body.fileId, user.uid);
        preamble = buildFileSystemPrompt({
          id: body.fileId,
          name: file.name,
          displayName: file.displayName,
          size: file.size,
          summary: file.summary,
          headers: Array.isArray(file.headers) ? file.headers : undefined,
          status: file.status,
        });
      } catch {
        // keep generic preamble
      }
    }

    const data = await askAI({ messages: body.messages, preamble }); // ← aquí el cambio
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
