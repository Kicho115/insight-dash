"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";
import { IoChatbubblesOutline, IoClose, IoSend } from "react-icons/io5";
import { useChat } from "@/hooks/useChat";
import type { ChatMessage } from "@/lib/helpers/chat";

type Props = { initialSystemPrompt: string };

export default function ChatWidget({ initialSystemPrompt }: Props) {
  if (!initialSystemPrompt) return null;

  const [open, setOpen] = useState<boolean>(false);
  const { messages, input, sending, error, canSend, setInput, handleSubmit } =
    useChat(initialSystemPrompt);

  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) {
      viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight });
    }
  }, [open, messages]);

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
