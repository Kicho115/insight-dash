"use client";



import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./styles.module.css";
import { askAi } from "@/services/ai";
import type { ChatMessage } from "@/lib/helpers/chat";
import { IoSend, IoChatbubblesOutline, IoClose } from "react-icons/io5";

export default function FileChat() {
  // UI state
  const [open, setOpen] = useState<boolean>(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! How can I help you today?" },
  ]);
  const [input, setInput] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo<boolean>(() => input.trim().length > 0 && !sending, [input, sending]);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on open or new messages
  useEffect(() => {
    if (open) {
      viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight });
    }
  }, [open, messages]);

  async function send(): Promise<void> {
    const text = input.trim();
    if (!text || sending) return;

    setError(null);
    setInput("");

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setSending(true);

    try {
      const result = await askAi({ messages: next, options: { temperature: 0.2 } });
      if (result.success) {
        // Expect { content: string } in result.data (do not assume SDK-specific shapes)
        const payload = result.data as unknown;
        let content = "No content.";
        if (typeof payload === "object" && payload !== null && "content" in payload) {
          const raw = (payload as { content: unknown }).content;
          content = typeof raw === "string" ? raw : JSON.stringify(raw);
        }
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
        ...messages,
        { role: "assistant", content: "An unexpected error occurred. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    void send();
  }

  return (
    <>
      {/* Floating toggle button (always visible) */}
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

      {/* Overlay panel (out-of-flow) */}
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

          <form className={styles.composer} onSubmit={onSubmit}>
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
