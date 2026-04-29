// src/hooks/useChat.ts
"use client";

import { useMemo, useRef, useState } from "react";
import { askAi } from "@/services/ai";
import type { ChatMessage } from "@/lib/helpers/chat";
import type { Dashboard } from "@/types/dashboard";

const DASHBOARD_SIGNAL_RE = /`?<generate-dashboard\s*\/>`?/i;

export function useChat(fileId?: string) {
  const initialMessages = useMemo<ChatMessage[]>(
    () => [{ role: "assistant", content: "Hi! How can I help you today?" }],
    []
  );

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const lastUserMessage = useRef<string>("");
  const [pendingDashboard, setPendingDashboard] = useState<Dashboard | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const lastDashboardHistory = useRef<ChatMessage[]>([]);

  const canSend = input.trim().length > 0 && !sending;

  async function fetchDashboard(history: ChatMessage[]): Promise<void> {
    if (!fileId) return;
    lastDashboardHistory.current = history;
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const res = await fetch(`/api/files/${fileId}/chat-dashboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      if (res.ok && data.dashboard) {
        setPendingDashboard(data.dashboard);
      } else {
        setDashboardError(data?.error ?? "Failed to generate dashboard.");
      }
    } catch {
      setDashboardError("Unexpected error generating dashboard.");
    } finally {
      setDashboardLoading(false);
    }
  }

  async function retryDashboard(): Promise<void> {
    if (lastDashboardHistory.current.length > 0) {
      await fetchDashboard(lastDashboardHistory.current);
    }
  }

  async function send(overrideText?: string): Promise<void> {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;

    setError(null);
    if (!overrideText) setInput("");
    lastUserMessage.current = text;

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setSending(true);

    try {
      const result = await askAi({ messages: next, fileId });

      if (result.success) {
        const raw = result.data.content ?? "No content.";
        const hasDashboard = DASHBOARD_SIGNAL_RE.test(raw);
        const content = raw.replace(DASHBOARD_SIGNAL_RE, "").trim();

        const assistantMessage: ChatMessage = { role: "assistant", content, hasDashboard };
        const updated = [...next, assistantMessage];
        setMessages(updated);

        if (hasDashboard && fileId) {
          void fetchDashboard(updated);
        }
      } else {
        setError("The AI could not respond.");
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

  function clearDashboard(): void {
    setPendingDashboard(null);
  }

  async function retryChat(): Promise<void> {
    if (!lastUserMessage.current || sending) return;
    const text = lastUserMessage.current;
    // Remove last two messages (failed assistant reply + original user message)
    setMessages((prev) => prev.slice(0, -2));
    await send(text);
  }

  return {
    messages,
    input,
    sending,
    error,
    canSend,
    setInput,
    handleSubmit,
    retryChat,
    pendingDashboard,
    dashboardLoading,
    dashboardError,
    clearDashboard,
    retryDashboard,
  };
}
