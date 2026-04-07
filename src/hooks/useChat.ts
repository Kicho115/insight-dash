// src/hooks/useChat.ts
"use client";

import { useMemo, useState } from "react";
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
  const [pendingDashboard, setPendingDashboard] = useState<Dashboard | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(false);

  const canSend = input.trim().length > 0 && !sending;

  async function fetchDashboard(history: ChatMessage[]): Promise<void> {
    if (!fileId) return;
    setDashboardLoading(true);
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
        const message = data?.error ?? "Failed to generate dashboard.";
        setError(`Dashboard: ${message}`);
      }
    } catch {
      setError("Dashboard: unexpected error, check the server logs.");
    } finally {
      setDashboardLoading(false);
    }
  }

  async function send(): Promise<void> {
    const text = input.trim();
    if (!text || sending) return;

    setError(null);
    setInput("");

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setSending(true);

    try {
      const result = await askAi({ messages: next, fileId });

      if (result.success) {
        const raw = result.data.content ?? "No content.";
        const hasDashboard = DASHBOARD_SIGNAL_RE.test(raw);
        console.log("[useChat] hasDashboard:", hasDashboard, "| raw tail:", raw.slice(-60));
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

  return {
    messages,
    input,
    sending,
    error,
    canSend,
    setInput,
    handleSubmit,
    pendingDashboard,
    dashboardLoading,
    clearDashboard,
  };
}
