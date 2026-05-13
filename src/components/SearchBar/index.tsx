"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./styles.module.css";
import { getAlgoliaSearchClient, getDefaultAlgoliaIndexName } from "@/lib/algolia";
import { File } from "@/types/file";
import { FaSearch, FaSpinner } from "react-icons/fa";

interface SearchBarProps {
    indexName?: string;
    placeholder?: string;
}

export const SearchBar = ({ indexName, placeholder = "Search files..." }: SearchBarProps) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<File[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const activeIndexName = indexName || getDefaultAlgoliaIndexName();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const searchAlgolia = async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const client = getAlgoliaSearchClient();
                const { results: searchResults } = await client.search({
                    requests: [
                        {
                            indexName: activeIndexName,
                            query,
                            hitsPerPage: 5,
                        },
                    ],
                });

                if (searchResults && searchResults.length > 0) {
                    const firstResult = searchResults[0];
                    if ('hits' in firstResult) {
                        setResults(firstResult.hits as unknown as File[]);
                    }
                }
            } catch (error) {
                console.error("Algolia search error:", error);
            } finally {
                setIsSearching(false);
            }
        };

        const debounceTimer = setTimeout(() => {
            searchAlgolia();
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [query, activeIndexName]);

    return (
        <div className={styles.searchContainer} ref={containerRef}>
            <div className={styles.inputWrapper}>
                <FaSearch className={styles.searchIcon} />
                <input
                    type="text"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className={styles.searchInput}
                />
                {isSearching && <FaSpinner className={styles.spinner} />}
            </div>

            {isOpen && query.trim() && (
                <div className={styles.dropdown}>
                    {results.length > 0 ? (
                        results.map((hit) => (
                            <Link
                                key={hit.id || (hit as any).objectID}
                                href={`/files/${hit.id || (hit as any).objectID}`}
                                className={styles.resultItem}
                                onClick={() => {
                                    setIsOpen(false);
                                    setQuery("");
                                }}
                            >
                                <div className={styles.resultInfo}>
                                    <span className={styles.fileName}>{hit.displayName || hit.name}</span>
                                    {hit.status && (
                                        <span className={`${styles.status} ${styles[hit.status.toLowerCase().replace(" ", "")] || ""}`}>
                                            {hit.status}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className={styles.noResults}>
                            {!isSearching && "No results found"}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
