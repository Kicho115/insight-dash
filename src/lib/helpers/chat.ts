
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}


export function serializeMessages(messages: ChatMessage[]): string {
  const system = messages.filter(m => m.role === "system").map(m => m.content);
  const turns = messages
    .filter(m => m.role !== "system")
    .map(m => `${m.role.toUpperCase()}: ${m.content}`);
  const preamble = system.length > 0 ? `${system.join("\n\n")}\n\n` : "";
  return `${preamble}${turns.join("\n\n")}`;
}


export function extractTextFromGenkitResult(result: unknown): string {
  
  if (
    typeof result === "object" &&
    result !== null &&
    "text" in result &&
    typeof (result as { text: unknown }).text === "function"
  ) {
    try {
      return (result as { text: () => string }).text();
    } catch {
     
    }
  }


  if (
    typeof result === "object" &&
    result !== null &&
    "outputText" in result &&
    typeof (result as { outputText: unknown }).outputText === "string"
  ) {
    return (result as { outputText: string }).outputText;
  }

 
  if (
    typeof result === "object" &&
    result !== null &&
    "response" in result &&
    typeof (result as { response: unknown }).response === "object" &&
    (result as { response: { text?: unknown } }).response !== null &&
    typeof (result as { response: { text?: unknown } }).response.text === "function"
  ) {
    try {
      return (result as { response: { text: () => string } }).response.text();
    } catch {
    
    }
  }


  try {
    return JSON.stringify(result);
  } catch {
    return "[No content]";
  }
}
