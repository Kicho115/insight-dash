type AIMessage = { role: "system" | "user" | "assistant"; content: string };

export interface AskAiInput {
  userId: string;
  messages: AIMessage[];
  fileIds?: string[];    // opcional: IDs de archivos para dar contexto
  options?: Record<string, unknown>; // temperature, top_p, etc., si tu API lo usa
}

export interface AskAiResult {
  success: boolean;
  data?: any;     // estructura de respuesta que devuelva tu askAi.ts
  error?: string; // mensaje de error legible
}

export async function askAi(input: AskAiInput): Promise<AskAiResult> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  // Nunca lances aquí: devuelve objeto tipado y maneja en el componente
  try {
    const json = (await res.json()) as AskAiResult;
    return json;
  } catch {
    return { success: false, error: "Invalid JSON from /api/ai" };
  }
}
