"use client";

import { useMemo, useState } from "react";
import { askAi } from "@/services/ai";
import type { ChatMessage } from "@/lib/helpers/chat";

export function useChat(_initialSystemPrompt?: string) {
  const initialMessages = useMemo<ChatMessage[]>(
    () => [{ role: "assistant", content: "Hi! How can I help you today?" }],
    []
  );

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = input.trim().length > 0 && !sending;

  async function send(): Promise<void> {
    const text = input.trim();
    if (!text || sending) return;

    setError(null);
    setInput("");

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setSending(true);

    try {
 
      const payload: ChatMessage[] = [{ role: "user", content: text }];

      const result = await askAi({ messages: payload });

      if (result.success) {
        const content = result.data.content ?? "No content.";
        setMessages([...next, { role: "assistant", content }]);
      } else {
        setError(result.error || "The AI could not respond.");
        setMessages([
          ...next,
          { role: "assistant", content: "Sorry, I couldn't reply right now. Please try again." },
        ]);
      }
    } catch {
      setError("Unexpected error while contacting the AI.");
      setMessages([
        ...next,
        { role: "assistant", content: "An unexpected error occurred. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    void send();
  }

  return { messages, input, sending, error, canSend, setInput, handleSubmit };
}
