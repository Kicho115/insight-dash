import { NextResponse } from "next/server";
import { z } from "zod";
import { getFileById } from "@/data/files";
import { getFileDownloadURL } from "@/data/storage/files";
import { handleApiError } from "@/lib/api/errorHandler";
import { dashboardSchema } from "@/lib/api/schemas";
import { requireServerAuth } from "@/lib/serverAuth";
import { generateConversationalDashboardFlow } from "@/services/genkit/flows/generateConversationalDashboard";

export const maxDuration = 120;

const requestSchema = z.object({
    messages: z
        .array(
            z.object({
                role: z.enum(["system", "user", "assistant"]),
                content: z.string(),
            }),
        )
        .min(1),
});

export async function POST(
    request: Request,
    { params }: { params: Promise<{ fileId: string }> },
) {
    try {
        const user = await requireServerAuth();
        const { fileId } = await params;

        const file = await getFileById(fileId, user.uid);

        const headers = file.metadata?.headers;
        if (!headers || !Array.isArray(headers) || headers.length === 0) {
            return NextResponse.json(
                { error: "File headers are missing. Process the file first." },
                { status: 422 },
            );
        }

        const summary = file.metadata?.summary?.trim();
        if (!summary) {
            return NextResponse.json(
                { error: "File summary is missing. Process the file first." },
                { status: 422 },
            );
        }

        const body = requestSchema.parse(await request.json());

        const downloadUrl = await getFileDownloadURL(file.path);
        const fileResponse = await fetch(downloadUrl);
        if (!fileResponse.ok) {
            return NextResponse.json(
                { error: "Failed to download file from storage." },
                { status: 502 },
            );
        }
        const fileBuffer = await fileResponse.arrayBuffer();

        const fileExtension =
            file.name?.split(".").pop()?.toLowerCase() ?? "csv";

        const structure = await generateConversationalDashboardFlow({
            fileName: file.displayName ?? file.name,
            fileExtension,
            fileBuffer,
            headers,
            summary,
            conversationHistory: body.messages,
        });

        const dashboard = dashboardSchema.parse(structure);

        return NextResponse.json({ success: true, dashboard });
    } catch (error) {
        console.error("[chat-dashboard/route] error:", error);
        return handleApiError(error);
    }
}
