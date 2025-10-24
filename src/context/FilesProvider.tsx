"use client";

import {
    createContext,
    useState,
    useContext,
    ReactNode,
    useEffect,
    useCallback,
} from "react";
import {
    collection,
    query,
    where,
    onSnapshot,
    or,
    Timestamp,
} from "firebase/firestore";
import { db } from "@/services/firebase/config";
import { File as FileMetadata, FileStatus } from "@/types/user";
import { getFilesForUser } from "@/services/files";
import { useAuth } from "./AuthProvider";

interface FilesContextType {
    files: FileMetadata[];
    isLoading: boolean;
    error: string | null;
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
    const { user } = useAuth();
    const [files, setFiles] = useState<FileMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setFiles([]);
            setIsLoading(false);
            return () => {}; // Return an empty cleanup function
        }

        setIsLoading(true);
        setError(null);

        const filesQuery = query(
            collection(db, "files"),
            or(where("creatorId", "==", user.id), where("isPublic", "==", true))
        );

        const unsubscribe = onSnapshot(
            filesQuery,
            (querySnapshot) => {
                const filesData: FileMetadata[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const createdAt =
                        data.createdAt instanceof Timestamp
                            ? data.createdAt.toDate()
                            : new Date();
                    const updatedAt =
                        data.updatedAt instanceof Timestamp
                            ? data.updatedAt.toDate()
                            : new Date();

                    filesData.push({
                        ...(data as Omit<
                            FileMetadata,
                            "id" | "createdAt" | "updatedAt"
                        >),
                        id: doc.id,
                        createdAt,
                        updatedAt,
                        status: data.status || ("Unknown" as FileStatus),
                    });
                });

                filesData.sort(
                    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
                );

                setFiles(filesData);
                setIsLoading(false);
            },
            (err) => {
                console.error("Error listening to files collection:", err);
                setError("Failed to load files in real-time.");
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user]);

    const value = {
        files,
        isLoading,
        error,
    };

    return (
        <FilesContext.Provider value={value}>{children}</FilesContext.Provider>
    );
};
