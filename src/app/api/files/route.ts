import { NextResponse } from "next/server";
import { dbAdmin } from "@/services/firebase/admin";
import { requireServerAuth } from "@/lib/serverAuth";
import { File as FileMetadata } from "@/types/user";

/**
 * @route GET /api/files
 * @description Fetches all files accessible to the authenticated user (their own and public files).
 */
export async function GET() {
    try {
        const user = await requireServerAuth();

        // Create queries for user-owned files and public files
        const userFilesQuery = dbAdmin
            .collection("files")
            .where("creatorId", "==", user.uid);
        const publicFilesQuery = dbAdmin
            .collection("files")
            .where("isPublic", "==", true);

        // Run queries in parallel for efficiency
        const [userFilesSnapshot, publicFilesSnapshot] = await Promise.all([
            userFilesQuery.get(),
            publicFilesQuery.get(),
        ]);

        const filesMap = new Map<string, FileMetadata>();

        // Helper function to process and add a document to the map
        const processDoc = (doc: FirebaseFirestore.DocumentSnapshot) => {
            const data = doc.data();
            if (!data) return;

            // Convert Firestore Timestamps to serializable ISO strings for the client
            const createdAt = data.createdAt.toDate().toISOString();
            const updatedAt = data.updatedAt.toDate().toISOString();

            // Ensure required fields are present and not undefined
            if (
                typeof data.name === "string" &&
                typeof data.displayName === "string" &&
                typeof data.url === "string" &&
                typeof data.creatorId === "string" &&
                typeof data.path === "string" &&
                typeof data.size === "number"
            ) {
                filesMap.set(doc.id, {
                    ...(data as FileMetadata),
                    id: doc.id,
                    createdAt,
                    updatedAt,
                });
            }
        };

        // Add user's files and public files to the map, avoiding duplicates
        userFilesSnapshot.forEach(processDoc);
        publicFilesSnapshot.forEach(processDoc);

        const files = Array.from(filesMap.values());

        // Sort files by creation date, newest first
        files.sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
        );

        return NextResponse.json(files);
    } catch (error) {
        console.error("Error fetching files:", error);
        if ((error as Error).message === "Authentication required") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
