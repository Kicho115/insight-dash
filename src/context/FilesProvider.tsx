"use client";

import {
    createContext,
    useState,
    useContext,
    ReactNode,
    useEffect,
    useCallback,
} from "react";
import { File as FileMetadata } from "@/types/user";
import { getFilesForUser } from "@/services/files";

interface FilesContextType {
    files: FileMetadata[];
    isLoading: boolean;
    error: string | null;
    refetchFiles: () => void;
}

const FilesContext = createContext<FilesContextType | undefined>(undefined);

/**
 * @hook useFiles
 * @description A custom hook to access the files context.
 */
export const useFiles = () => {
    const context = useContext(FilesContext);
    if (context === undefined) {
        throw new Error("useFiles must be used within a FilesProvider");
    }
    return context;
};

/**
 * @component FilesProvider
 * @description Provides file state and actions to its children components.
 */
export const FilesProvider = ({ children }: { children: ReactNode }) => {
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFiles = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const userFiles = await getFilesForUser();
            setFiles(userFiles);
        } catch (err) {
            setError("Failed to load files. Please try again later.");
            console.error("Error fetching files:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const value = {
        files,
        isLoading,
        error,
        refetchFiles: fetchFiles,
    };

    return (
        <FilesContext.Provider value={value}>{children}</FilesContext.Provider>
    );
};
