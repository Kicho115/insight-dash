import { useState, useEffect, useRef } from "react";
import {
    collection,
    query,
    where,
    onSnapshot,
    Unsubscribe,
} from "firebase/firestore";
import { db } from "@/services/firebase/config";
import { File as FileMetadata } from "@/types/file";
import { Team, AppUser } from "@/types/user";

// Helper type to allow both string and Date for timestamps,
// handling the mix of server-side serialized data and client-side Firestore dates.
type FileWithDatesOrStrings = Omit<
    FileMetadata,
    "createdAt" | "updatedAt"
> & {
    createdAt: Date | string;
    updatedAt: Date | string;
};

export function useRealtimeFiles(
    initialFiles: FileWithDatesOrStrings[],
    user: AppUser | null,
    userTeams: Team[]
) {
    const [files, setFiles] = useState<FileWithDatesOrStrings[]>(initialFiles);
    
    // We use a ref to store the current state of files from different sources
    // to avoid race conditions and easy merging.
    // Keys are "user", "public", and "team_{index}"
    const filesMapRef = useRef<Map<string, Map<string, FileWithDatesOrStrings>>>(new Map());

    useEffect(() => {
        if (!user) {
            setFiles([]);
            return;
        }

        const unsubscribers: Unsubscribe[] = [];
        const filesCollection = collection(db, "files");

        // Initialize the map categories if they don't exist
        if (!filesMapRef.current.has("user")) filesMapRef.current.set("user", new Map());
        if (!filesMapRef.current.has("public")) filesMapRef.current.set("public", new Map());

        // Helper to update state from the map
        const updateState = () => {
            const allFilesMap = new Map<string, FileWithDatesOrStrings>();
            
            filesMapRef.current.forEach((categoryMap) => {
                categoryMap.forEach((file, id) => {
                    allFilesMap.set(id, file);
                });
            });

            const allFiles = Array.from(allFilesMap.values());
            // Sort by createdAt desc
            allFiles.sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return dateB - dateA;
            });

            setFiles(allFiles);
        };

        // 1. User Files Query
        const userFilesQuery = query(
            filesCollection,
            where("creatorId", "==", user.id)
        );
        
        unsubscribers.push(
            onSnapshot(userFilesQuery, (snapshot) => {
                const categoryMap = new Map<string, FileWithDatesOrStrings>();
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    categoryMap.set(doc.id, {
                        ...data,
                        id: doc.id,
                        createdAt: data.createdAt?.toDate() || new Date(),
                        updatedAt: data.updatedAt?.toDate() || new Date(),
                    } as FileWithDatesOrStrings);
                });
                filesMapRef.current.set("user", categoryMap);
                updateState();
            })
        );

        // 2. Public Files Query
        const publicFilesQuery = query(
            filesCollection,
            where("isPublic", "==", true)
        );

        unsubscribers.push(
            onSnapshot(publicFilesQuery, (snapshot) => {
                const categoryMap = new Map<string, FileWithDatesOrStrings>();
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    categoryMap.set(doc.id, {
                        ...data,
                        id: doc.id,
                        createdAt: data.createdAt?.toDate() || new Date(),
                        updatedAt: data.updatedAt?.toDate() || new Date(),
                    } as FileWithDatesOrStrings);
                });
                filesMapRef.current.set("public", categoryMap);
                updateState();
            })
        );

        // 3. Team Files Queries (Chunked)
        const userTeamIds = userTeams.map((t) => t.id);
        if (userTeamIds.length > 0) {
            const chunkSize = 30;
            for (let i = 0; i < userTeamIds.length; i += chunkSize) {
                const chunk = userTeamIds.slice(i, i + chunkSize);
                const key = `team_${i}`;
                
                if (!filesMapRef.current.has(key)) filesMapRef.current.set(key, new Map());

                const teamQuery = query(
                    filesCollection,
                    where("teamIds", "array-contains-any", chunk)
                );

                unsubscribers.push(
                    onSnapshot(teamQuery, (snapshot) => {
                        const categoryMap = new Map<string, FileWithDatesOrStrings>();
                        snapshot.forEach((doc) => {
                            const data = doc.data();
                            categoryMap.set(doc.id, {
                                ...data,
                                id: doc.id,
                                createdAt: data.createdAt?.toDate() || new Date(),
                                updatedAt: data.updatedAt?.toDate() || new Date(),
                            } as FileWithDatesOrStrings);
                        });
                        filesMapRef.current.set(key, categoryMap);
                        updateState();
                    })
                );
            }
        }

        return () => {
            unsubscribers.forEach((unsub) => unsub());
        };
    }, [user, userTeams]); // Re-subscribe if user or teams change

    return files;
}

