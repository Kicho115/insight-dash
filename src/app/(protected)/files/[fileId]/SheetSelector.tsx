"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./styles.module.css";
import type { SheetInfo } from "@/types/file";

type Props = {
    fileId: string;
    sheets: SheetInfo[];
    selectedSheet: string;
};

export function SheetSelector({ fileId, sheets, selectedSheet }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (sheets.length <= 1) return null;

    async function handleSelect(sheetName: string) {
        if (sheetName === selectedSheet || loading) return;
        setLoading(sheetName);
        setError(null);
        try {
            const res = await fetch(`/api/files/${fileId}/select-sheet`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sheetName }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data?.error ?? "Failed to switch sheet.");
            } else {
                router.refresh();
            }
        } catch {
            setError("Unexpected error switching sheet.");
        } finally {
            setLoading(null);
        }
    }

    return (
        <div className={styles.sheetSelector}>
            <h3 className={styles.sheetSelectorTitle}>Sheets</h3>
            {error && <p className={styles.sheetSelectorError}>{error}</p>}
            <div className={styles.sheetList}>
                {sheets.map((sheet) => {
                    const isActive = sheet.name === selectedSheet;
                    const isLoading = loading === sheet.name;
                    return (
                        <div
                            key={sheet.name}
                            className={`${styles.sheetItem} ${isActive ? styles.sheetItemActive : ""}`}
                        >
                            <div className={styles.sheetItemInfo}>
                                <span className={styles.sheetItemName}>{sheet.name}</span>
                                <span className={styles.sheetItemMeta}>
                                    {sheet.numberOfRows} rows · {sheet.numberOfColumns} cols
                                </span>
                            </div>
                            {isActive ? (
                                <span className={styles.sheetActiveBadge}>Active</span>
                            ) : (
                                <button
                                    type="button"
                                    className={styles.sheetSelectButton}
                                    onClick={() => handleSelect(sheet.name)}
                                    disabled={!!loading}
                                >
                                    {isLoading ? "Switching..." : "Use this sheet"}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
