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
  const { firebaseAuthUser } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!firebaseAuthUser) {
      router.push("/sign-in");
    }
  }, [firebaseAuthUser, router]);

  return (
    <div style={{ display: "flex", height: "100dvh", width: "100dvw" }}>
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
