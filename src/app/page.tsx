// app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { LoadingSpinner } from "@/components/loading";

/**
 * @page HomePage
 * @description This is the root entry point of the app. Its sole responsibility
 * is to check the user's authentication status and redirect them to the
 * appropriate page (/sign-in or /home). It shows a loading spinner
 * during this check to prevent UI flashes.
 */
export default function HomePage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Only perform redirection after the initial loading is complete.
        if (!loading) {
            if (user) {
                // If a user profile exists, they are fully authenticated.
                router.replace("/home");
            } else {
                // If no user, they need to sign in.
                router.replace("/sign-in");
            }
        }
    }, [user, loading, router]);

    // Render a full-screen loading spinner while the auth state is being determined.
    // This is what the user sees for a brief moment upon visiting the site.
    return <LoadingSpinner fullScreen text="Initializing..." size="medium" />;
}
