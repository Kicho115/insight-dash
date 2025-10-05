"use client";

import AskAI from "@/components/askAI";
import { useFiles } from "@/context/FilesProvider";

export default function AskPage() {
  const { files } = useFiles();
  return (
    <main className="p-6">
      <AskAI files={files} title="Preguntar a la IA" />
    </main>
  );
}
