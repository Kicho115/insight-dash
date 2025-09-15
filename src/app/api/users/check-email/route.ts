import { NextResponse } from "next/server";
import { dbAdmin } from "@/services/firebase/admin";

/**
 * @route POST /api/users/check-email
 * @description Checks if a user with the given email exists in Firestore.
 * This is a secure way for the client to verify an email without direct DB access.
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    // Query the 'users' collection using the Admin SDK
    const usersRef = dbAdmin.collection("users");
    const snapshot = await usersRef.where("email", "==", email).limit(1).get();

    if (snapshot.empty) {
      // No user found with this email
      return NextResponse.json({ exists: false });
    }

    // User found
    return NextResponse.json({ exists: true });
  } catch (error) {
    console.error("Error checking email existence:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
