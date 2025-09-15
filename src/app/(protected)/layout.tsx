// Import components
"use client";

import { useState, ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth"; // Assuming this is your auth hook
import styles from "./layout.module.css";

// Import your components
import { Sidebar } from "@/components/sidebar";
import { Modal } from "@/components/modal";
import { UploadForm } from "@/components/uploadForm";

/**
 * @component ProtectedLayout
 * @description A layout component that protects routes and provides the main app structure.
 */
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useFirebaseAuth();
  const router = useRouter();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/sign-in");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div>Verificando sesión...</div>;
  }

  return (
    <div className={styles.container}>
      <Sidebar onUploadClick={() => setIsUploadModalOpen(true)} />

      <main className={styles.content}>{children}</main>

      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      >
        <UploadForm />
      </Modal>
    </div>
  );
}
