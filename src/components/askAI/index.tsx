"use client";

import { useMemo, useState, FormEvent } from "react";
import styles from "./styles.module.css";
import { useAuth } from "@/context/AuthProvider";
import { askAi } from "@/services/ai";
import { File as FileMetadata } from "@/types/user";
import {
  IoSparkles,
  IoPaperPlaneOutline,
  IoDocumentTextOutline,
  IoWarningOutline,
  IoCheckmarkCircleOutline,
} from "react-icons/io5";

type AIMessage = { role: "system" | "user" | "assistant"; content: string };

interface AskAIProps {
  /** Archivos existentes para seleccionar como contexto (opcional) */
  files?: FileMetadata[];
  /** Título visible del widget */
  title?: string;
  /** Placeholder del textarea */
  placeholder?: string;
}

export default function AskAI({ files = [], title = "Preguntar a la IA", placeholder = "Escribe tu pregunta o instrucción…" }: AskAIProps) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string>("");

  const canSend = useMemo(
    () => !!user && prompt.trim().length > 0 && !loading,
    [user, prompt, loading]
  );

  const toggleFile = (id: string, checked: boolean) => {
    setSelectedFileIds(prev =>
      checked ? [...prev, id] : prev.filter(x => x !== id)
    );
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErr("Debes iniciar sesión para enviar mensajes a la IA.");
      return;
    }
    setErr(null);
    setAnswer("");
    setLoading(true);

    const messages: AIMessage[] = [
      { role: "system", content: "Eres un asistente útil que analiza datos y responde de forma breve y accionable." },
      { role: "user", content: prompt.trim() },
    ];

    const result = await askAi({
      userId: user.id,
      messages,
      fileIds: selectedFileIds,
      options: { temperature: 0.2 },
    });

    setLoading(false);

    if (!result.success) {
      setErr(result.error || "No se pudo obtener respuesta de la IA.");
      return;
    }

    const content =
      result.data?.content ??
      result.data?.choices?.[0]?.message?.content ??
      JSON.stringify(result.data, null, 2);

    setAnswer(content || "(Respuesta vacía)");
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <IoSparkles className={styles.headerIcon} />
        <h2 className={styles.title}>{title}</h2>
      </div>

      <form onSubmit={onSubmit} className={styles.form}>
        <label className={styles.label}>Mensaje</label>
        <textarea
          className={styles.textarea}
          rows={5}
          placeholder={placeholder}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        {files.length > 0 && (
          <div className={styles.filesBlock}>
            <div className={styles.filesHeader}>
              <IoDocumentTextOutline />
              <span>Archivos (opcional)</span>
            </div>
            <div className={styles.filesGrid}>
              {files.map((f) => {
                const checked = selectedFileIds.includes(f.id);
                return (
                  <label key={f.id} className={`${styles.fileItem} ${checked ? styles.fileChecked : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleFile(f.id, e.target.checked)}
                    />
                    <span className={styles.fileName}>{f.displayName ?? f.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="submit"
          className={styles.primaryButton}
          disabled={!canSend}
        >
          {loading ? "Enviando…" : (<><IoPaperPlaneOutline /> Enviar a la IA</>)}
        </button>
      </form>

      {err && (
        <div className={`${styles.alert} ${styles.error}`}>
          <IoWarningOutline />
          <span>{err}</span>
        </div>
      )}

      {answer && (
        <div className={styles.answerBlock}>
          <div className={styles.answerHeader}>
            <IoCheckmarkCircleOutline />
            <span>Respuesta</span>
          </div>
          <pre className={styles.answer}>{answer}</pre>
        </div>
      )}
    </div>
  );
}
