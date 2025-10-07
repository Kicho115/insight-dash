// src/app/ask/page.tsx
"use client";

import AskAI from "@/components/askAI";
import { useFiles } from "@/context/FilesProvider"; // ✅ aquí está el hook

export default function AskPage() {
  const { files } = useFiles(); // ✅ viene del provider

  return (
    <main className="p-6">
      <AskAI files={files} title="Preguntar a la IA" />
    </main>
  );
}
