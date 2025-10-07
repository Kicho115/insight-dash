"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";
import { useAuth } from "@/context/AuthProvider";
import { askAi } from "@/services/ai";
import { File as FileMetadata } from "@/types/user";
import { IoSend, IoDocumentTextOutline } from "react-icons/io5";

type Role = "system" | "user" | "assistant";
type Msg = { role: Role; content: string };

export default function FileChat({ file }: { file: FileMetadata }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "system",
      content:
        "Eres un analista que ayuda a entender datos del archivo seleccionado. Si el usuario pide resúmenes, insights o validaciones, responde conciso y accionable.",
    },
    {
      role: "assistant",
      content: `Estoy listo. ¿Qué te gustaría analizar de **${file.displayName ?? file.name}**?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  // autoscroll
  useEffect(() => {
    viewportRef.current?.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setSending(true);

    try {
      const result = await askAi({
        userId: (user as any)?.id ?? (user as any)?.uid ?? "anon",
        messages: next,
        fileIds: [file.id],
        options: { temperature: 0.2 },
      });

      const content =
        (result.data?.content as string) ??
        result.data?.choices?.[0]?.message?.content ??
        "(sin contenido)";
      setMessages([...next, { role: "assistant", content }]);
    } catch (e) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: "No pude responder en este momento. Intenta de nuevo.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send();
  };

  return (
    <div className={styles.wrapper}>
      {/* Header simple con metadata */}
      <header className={styles.header}>
        <div className={styles.fileMeta}>
          <IoDocumentTextOutline />
          <div className={styles.fileTitles}>
            <div className={styles.fileName}>{file.displayName ?? file.name}</div>
            <div className={styles.fileSub}>
              {getMime(file)} · {getSize(file)}

            </div>
          </div>
        </div>
      </header>

      {/* Chat area */}
      <div className={styles.chatArea} ref={viewportRef}>
        {messages.map((m: Msg, i: number) => (
          <div key={i} className={`${styles.msg} ${m.role === "user" ? styles.user : styles.assistant}`}>
            <div className={styles.bubble} dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
          </div>
        ))}

        {sending && (
          <div className={`${styles.msg} ${styles.assistant}`}>
            <div className={styles.bubble}>
              <span className={styles.typing}>…</span>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={onSubmit} className={styles.composer}>
        <input
          className={styles.input}
          placeholder="Escribe tu mensaje…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className={styles.send} type="submit" disabled={!input.trim() || sending}>
          <IoSend />
        </button>
      </form>
    </div>
  );
}

/** Minimalísimo markdown a HTML (negritas, ital, code inline, saltos de línea) */
function renderMarkdown(md: string) {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br/>");
}
function getMime(file: FileMetadata): string {
  const anyf = file as any;
  return anyf.mime ?? anyf.mimeType ?? anyf.contentType ?? anyf.type ?? "archivo";
}

function getSize(file: FileMetadata): string {
  const anyf = file as any;
  const size = anyf.size ?? anyf.bytes ?? anyf.sizeBytes;
  return typeof size === "number" ? `${size} bytes` : "tamaño desconocido";
}
