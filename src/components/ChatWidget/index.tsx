// src/components/ChatWidget/index.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";
import { IoChatbubblesOutline, IoClose, IoSend } from "react-icons/io5";
import { useChat } from "@/hooks/useChat";
import type { ChatMessage } from "@/lib/helpers/chat";

type Props = { fileId?: string };

export default function ChatWidget({ fileId }: Props) {
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
    let intervalId: number | undefined;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/files/${fileId}`, { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) {
            setStatus(null);
            setStatusChecked(true);
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setStatus(data?.status ?? null);
          setStatusChecked(true);
        }
      } catch {
        if (!cancelled) {
          setStatus(null);
          setStatusChecked(true);
        }
      }
    };
    fetchStatus();
    intervalId = window.setInterval(fetchStatus, 3000);
    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [fileId]);

  const { messages, input, sending, error, canSend, setInput, handleSubmit } = useChat(fileId);

  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) {
      viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight });
    }
  }, [open, messages]);

  if (fileId && (!statusChecked || status !== "Ready")) {
    return null;
  }

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
                <div className={styles.bubble}>{m.content}</div>
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
