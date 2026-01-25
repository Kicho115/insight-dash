import * as admin from "firebase-admin";
import { requireEnv } from "@/lib/helpers/env";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    const serviceAccount = {
        type: "service_account",
        project_id: requireEnv("FIREBASE_PROJECT_ID"),
        private_key_id: requireEnv("FIREBASE_PRIVATE_KEY_ID"),
        private_key: requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
        client_email: requireEnv("FIREBASE_CLIENT_EMAIL"),
        client_id: requireEnv("FIREBASE_CLIENT_ID"),
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
            "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: requireEnv("FIREBASE_CLIENT_CERT_URL"),
    };

    admin.initializeApp({
        credential: admin.credential.cert(
            serviceAccount as admin.ServiceAccount
        ),
        projectId: requireEnv("FIREBASE_PROJECT_ID"),
        storageBucket: requireEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    });
}

export const authAdmin = admin.auth();
export const dbAdmin = admin.firestore();
export const storageAdmin = admin.storage();

export default admin;
