/**
 * @fileoverview API Route to handle secure file upload preparation.
 */

// Next.js imports
import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { v4 as uuidv4 } from "uuid";

// Local imports for server-side logic
import { requireServerAuth } from "@/lib/serverAuth"; // Your teammate's secure auth checker
import { dbAdmin } from "@/services/firebase/admin"; // Secure admin instance
import { File as AppFile } from "@/types/user"; // Your file type definition

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
    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { error: "Missing required file information." },
        { status: 400 }
      );
    }

    // 3. Prepare file metadata
    const fileId = uuidv4();
    const filePath = `files/${user.uid}/${fileId}/${fileName}`;

    const metadata: Omit<AppFile, "createdAt" | "updatedAt" | "url"> = {
      id: fileId,
      name: fileName,
      displayName: displayName || fileName,
      isPublic: isPublic,
      creatorId: user.uid,
      permissions: [{ type: "user", id: user.uid, role: "admin" }],
      isLocked: false,
      // We will add size, type, and URL later or handle them differently
    };

    // 4. Create the document in Firestore using the Admin SDK
    await dbAdmin.collection("files").doc(fileId).set(metadata);

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
