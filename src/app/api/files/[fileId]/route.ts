import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { dbAdmin } from "@/services/firebase/admin";
import { requireServerAuth } from "@/lib/serverAuth";

interface RouteParams {
    params: {
        fileId: string;
    };
}

/**
 * @route GET /api/files/[fileId]
 * @description Fetches the metadata for a single file.
 */
export async function GET(request: Request, { params }: RouteParams) {
    try {
        // Access params before awaiting server functions
        const fileId = params.fileId;
        const user = await requireServerAuth();

        const fileDoc = await dbAdmin.collection("files").doc(fileId).get();
        if (!fileDoc.exists) {
            return NextResponse.json(
                { error: "File not found" },
                { status: 404 }
            );
        }

        const fileData = fileDoc.data();
        // Security check: ensure user has permission to view this file
        if (fileData?.creatorId !== user.uid && !fileData?.isPublic) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json(fileData);
    } catch (error) {
        console.error("Error fetching single file:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * @route DELETE /api/files/[fileId]
 * @description Securely deletes a file from Storage and its metadata from Firestore.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const fileId = params.fileId;
        const user = await requireServerAuth();

        if (!fileId) {
            return NextResponse.json(
                { error: "File ID is required." },
                { status: 400 }
            );
        }

        const fileDocRef = dbAdmin.collection("files").doc(fileId);
        const fileDoc = await fileDocRef.get();

        if (!fileDoc.exists) {
            return NextResponse.json(
                { error: "File not found." },
                { status: 404 }
            );
        }

        const fileData = fileDoc.data();

        // Security check: ensure the user deleting the file is the creator.
        if (fileData?.creatorId !== user.uid) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Add a defensive check for the file path and provide the bucket name.
        // This prevents the "A file name must be specified" error if the path is missing.
        if (fileData && fileData.path && typeof fileData.path === "string") {
            const bucket = getStorage().bucket(
                process.env.FIREBASE_STORAGE_BUCKET
            );
            await bucket.file(fileData.path).delete();
        } else {
            // Log a warning if the file path is missing but proceed to delete metadata.
            console.warn(
                `File path not found for document ${fileId}. Deleting Firestore metadata only.`
            );
        }

        await fileDocRef.delete();

        return NextResponse.json({
            success: true,
            message: "File deleted successfully.",
        });
    } catch (error) {
        console.error("Error deleting file:", error);
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
