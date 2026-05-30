// src/components/ChatWidget/index.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";
import { IoChatbubblesOutline, IoClose, IoSend, IoBarChartOutline } from "react-icons/io5";
import { useChat } from "@/hooks/useChat";
import type { ChatMessage } from "@/lib/helpers/chat";
import ReactMarkdown from "react-markdown";

interface ChatState {
  messages: ChatMessage[];
  input: string;
  sending: boolean;
  error: string | null;
  canSend: boolean;
  setInput: (v: string) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  retryChat?: () => void;
}

type Props = {
  fileId?: string;
  /** When provided, the widget uses this external state instead of its own useChat */
  chatState?: ChatState;
  dashboardLoading?: boolean;
  dashboardError?: string | null;
  hasDashboard?: boolean;
  onOpenDashboard?: () => void;
  onRetryDashboard?: () => void;
};

export default function ChatWidget({
  fileId,
  chatState,
  dashboardLoading = false,
  dashboardError = null,
  hasDashboard = false,
  onOpenDashboard,
  onRetryDashboard,
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
    const intervalRef = { current: -1 as number };

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/files/${fileId}`, { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) { setStatus(null); setStatusChecked(true); }
          clearInterval(intervalRef.current);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setStatus(data?.status ?? null);
          setStatusChecked(true);
          if (data?.status === "Ready") clearInterval(intervalRef.current);
        }
      } catch {
        if (!cancelled) { setStatus(null); setStatusChecked(true); }
        clearInterval(intervalRef.current);
      }
    };

    fetchStatus();
    intervalRef.current = window.setInterval(fetchStatus, 3000);
    return () => { cancelled = true; clearInterval(intervalRef.current); };
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
    retryChat,
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
                  {m.role === "assistant" ? (
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  ) : m.content}
                  {m.hasDashboard && (
                    <div>
                      {dashboardLoading && idx === messages.length - 1 ? (
                        <span className={styles.dashboardButtonLoading}>
                          <span className={styles.miniSpinner} />
                          Generating dashboard…
                        </span>
                      ) : dashboardError && idx === messages.length - 1 ? (
                        <>
                          <p className={styles.dashboardErrorText}>
                            Service temporarily unavailable.
                          </p>
                          {onRetryDashboard && (
                            <button
                              type="button"
                              className={styles.retryButton}
                              onClick={onRetryDashboard}
                            >
                              Retry
                            </button>
                          )}
                        </>
                      ) : (
                        hasDashboard && onOpenDashboard && (
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
            {error && (
              <div className={styles.error}>
                {error}
                {retryChat && (
                  <button
                    type="button"
                    className={styles.retryButton}
                    style={{ marginTop: "6px", display: "flex" }}
                    onClick={() => void retryChat()}
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
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
