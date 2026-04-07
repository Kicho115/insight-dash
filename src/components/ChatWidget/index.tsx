// src/components/ChatWidget/index.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";
import { IoChatbubblesOutline, IoClose, IoSend, IoBarChartOutline } from "react-icons/io5";
import { useChat } from "@/hooks/useChat";
import type { ChatMessage } from "@/lib/helpers/chat";

interface ChatState {
  messages: ChatMessage[];
  input: string;
  sending: boolean;
  error: string | null;
  canSend: boolean;
  setInput: (v: string) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

type Props = {
  fileId?: string;
  /** When provided, the widget uses this external state instead of its own useChat */
  chatState?: ChatState;
  dashboardLoading?: boolean;
  hasDashboard?: boolean;
  onOpenDashboard?: () => void;
};

export default function ChatWidget({
  fileId,
  chatState,
  dashboardLoading = false,
  hasDashboard = false,
  onOpenDashboard,
}: Props) {
  const [open, setOpen] = useState<boolean>(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusChecked, setStatusChecked] = useState(false);

  useEffect(() => {
    if (!fileId) {
      setStatus("Ready");
      setStatusChecked(true);
      return;
    }

    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/files/${fileId}`, { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) { setStatus(null); setStatusChecked(true); }
          return;
        }
        const data = await res.json();
        if (!cancelled) { setStatus(data?.status ?? null); setStatusChecked(true); }
      } catch {
        if (!cancelled) { setStatus(null); setStatusChecked(true); }
      }
    };

    fetchStatus();
    const intervalId = window.setInterval(fetchStatus, 3000);
    return () => { cancelled = true; clearInterval(intervalId); };
  }, [fileId]);

  // Use external chatState if provided, otherwise fall back to own useChat
  const ownChat = useChat(chatState ? undefined : fileId);
  const {
    messages,
    input,
    sending,
    error,
    canSend,
    setInput,
    handleSubmit,
  } = chatState ?? ownChat;

  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) {
      viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight });
    }
  }, [open, messages]);

  const isVisible = !fileId || (statusChecked && status === "Ready");
  if (!isVisible) return null;

  return (
    <>
      <button
        type="button"
        className={styles.fab}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        title="Open chat"
      >
        <IoChatbubblesOutline />
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="AI chat">
          <header className={styles.header}>
            <div className={styles.headerTitle}>AI Assistant</div>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setOpen(false)}
              title="Close chat"
              aria-label="Close chat"
            >
              <IoClose />
            </button>
          </header>

          <div className={styles.body} ref={viewportRef}>
            {messages.map((m: ChatMessage, idx: number) => (
              <div key={idx} className={m.role === "user" ? styles.rowUser : styles.rowAssistant}>
                <div className={styles.bubble}>
                  {m.content}
                  {m.hasDashboard && onOpenDashboard && (
                    <div>
                      {dashboardLoading && idx === messages.length - 1 ? (
                        <span className={styles.dashboardButtonLoading}>
                          <span className={styles.miniSpinner} />
                          Generating dashboard…
                        </span>
                      ) : (
                        hasDashboard && (
                          <button
                            type="button"
                            className={styles.dashboardButton}
                            onClick={onOpenDashboard}
                          >
                            <IoBarChartOutline />
                            View dashboard
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className={styles.rowAssistant}>
                <div className={styles.bubble}>Typing…</div>
              </div>
            )}
            {error && <div className={styles.error}>{error}</div>}
          </div>

          <form className={styles.composer} onSubmit={handleSubmit}>
            <input
              className={styles.input}
              placeholder="Type your message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Message"
            />
            <button className={styles.send} type="submit" disabled={!canSend} title="Send">
              <IoSend />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
