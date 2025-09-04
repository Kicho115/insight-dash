"use client";

// Next.js imports
import { useRouter } from "next/navigation";

// React imports
import { useEffect } from "react";

// Import components
import { Sidebar } from "@/components/sidebar";

// Import authentication context
import { useAuthContext } from "@/context/AuthContext";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseAuthUser, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    // If not loading and no user, redirect to sign-in
    if (!loading && !firebaseAuthUser) {
      router.push("/sign-in");
    }
  }, [firebaseAuthUser, loading, router]);

  // While checking, don't show anything or a spinner to avoid showing protected content.
  if (loading || !firebaseAuthUser) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ display: "flex", height: "100dvh", width: "100dvw" }}>
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
