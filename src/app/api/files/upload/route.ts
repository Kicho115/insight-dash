/**
 * @fileoverview API Route to handle secure file upload preparation.
 */

// Next.js imports
import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { v4 as uuidv4 } from "uuid";
import { FieldValue } from "firebase-admin/firestore";

// Local imports for server-side logic
import { requireServerAuth } from "@/lib/serverAuth"; // Your teammate's secure auth checker
import { dbAdmin } from "@/services/firebase/admin"; // Secure admin instance
import { File as FileMetadata } from "@/types/user"; // Your file type definition

// Define the file size limit in megabytes
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * @function POST
 * @description Handles a POST request to prepare a file upload.
 * It authenticates the user, creates a file metadata document in Firestore,
 * and returns a signed URL for the client to upload the file to.
 */
export async function POST(request: Request) {
  try {
    // 1. Authenticate the user on the server
    const user = await requireServerAuth();

    // 2. Validate the incoming request body
    const { fileName, fileType, fileSize, isPublic, displayName } = await request.json();

    // Check the file size reported by the client.
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size cannot exceed ${MAX_FILE_SIZE_MB}MB.` },
        { status: 413 } // 413 Payload Too Large is the correct status code
      );
    }
    
    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { error: "Missing required file information." },
        { status: 400 }
      );
    }

    // 3. Prepare file metadata
    const fileId = uuidv4();
    const filePath = `files/${user.uid}/${fileId}/${fileName}`;
    const fileDocRef = dbAdmin.collection("files").doc(fileId);

    const metadata: Omit<FileMetadata, "createdAt" | "updatedAt" | "url" | "path"> = {
      id: fileId,
      name: fileName,
      displayName: displayName || fileName,
      size: fileSize,
      isPublic: isPublic,
      creatorId: user.uid,
      permissions: [{ type: "user", id: user.uid, role: "admin" }],
      isLocked: false,
    };

    const finalMetadata = {
      ...metadata,
      path: filePath,
      url: "", // This is a placeholder; can be updated after upload if needed
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // 4. Create the document in Firestore using the Admin SDK
    await fileDocRef.set(finalMetadata);

    // 5. Generate a Signed URL for the client to upload the file
    const bucket = getStorage().bucket(
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    );
    const file = bucket.file(filePath);

    const options = {
      version: "v4" as const,
      action: "write" as const,
      expires: Date.now() + 15 * 60 * 1000, // URL is valid for 15 minutes
      contentType: fileType,
    };

    const [signedUrl] = await file.getSignedUrl(options);

    // 6. Return the signed URL to the client
    return NextResponse.json({ signedUrl, fileId });
  } catch (error) {
    console.error("Error in prepare-upload API route:", error);
    // requireServerAuth throws an error, which we can catch here
    if ((error as Error).message === "Authentication required") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
