// src/app/api/ai/route.ts
import { NextResponse } from "next/server";
import { askAI } from "@/services/genkit/askAi";
import { requireServerAuth } from "@/lib/serverAuth";
import { getFileById } from "@/data/files";
import { buildFileSystemPrompt } from "@/lib/helpers/fileContext";
import { parseJson } from "@/lib/api/validation";
import { aiRequestSchema } from "@/lib/api/schemas";
import { handleApiError } from "@/lib/api/errorHandler";

export async function POST(req: Request) {
    try {
        const body = await parseJson(req, aiRequestSchema);

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
                    summary: file.metadata?.summary,
                    headers: Array.isArray(file.metadata?.headers)
                        ? file.metadata.headers
                        : undefined,
                    status: file.status,
                });
            } catch {
                // keep generic preamble
            }
        }

        const data = await askAI({ messages: body.messages, preamble });
        return NextResponse.json({ success: true, data });
    } catch (err) {
        return handleApiError(err);
    }
}
