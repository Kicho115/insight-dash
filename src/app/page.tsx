// app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { LoadingSpinner } from "@/components/loading";

export default function HomePage() {
    const { firebaseAuthUser, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Only redirect after loading is complete
        if (!loading) {
            if (firebaseAuthUser) {
                // If there is a user, take them to the home page
                router.push("/home");
            } else {
                // If there is no user, take them to sign in
                router.push("/sign-in");
            }
        }
    }, [firebaseAuthUser, loading, router]);

    // Show a loading screen while checking the session
    // to avoid flickering of the login page
    return <LoadingSpinner fullScreen text="Redirecting..." size="medium" />;
}
