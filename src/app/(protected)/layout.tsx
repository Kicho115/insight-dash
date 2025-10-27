// src/app/(protected)/layout.tsx
"use client";



import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import styles from "./layout.module.css";



// Providers & UI
import { UIProvider, useUI } from "@/context/UIProvider";
import { FilesProvider } from "@/context/FilesProvider";

// App chrome
import { Sidebar } from "@/components/sidebar";
import { Modal } from "@/components/modal";
import { UploadForm } from "@/components/uploadForm";

// Keep this small controller separate so only it re-renders on modal open/close
function AppModalController() {
  const { isUploadModalOpen, closeUploadModal } = useUI();
  return (
    <Modal isOpen={isUploadModalOpen} onClose={closeUploadModal}>
      <UploadForm onUploadSuccess={closeUploadModal} />
    </Modal>
  );
}

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Auth gate
  useEffect(() => {
    if (!loading && !user) {
      router.push("/sign-in");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <div>Verifying session...</div>;
  }

  // Main protected shell
  return (
    <UIProvider>
      <FilesProvider>
        <div className={styles.container}>
          <Sidebar />
          <main className={styles.content}>{children}</main>
          <AppModalController />
        </div>

        {/* Out-of-flow overlay, shown above the app without affecting layout */}

      </FilesProvider>
    </UIProvider>
  );
}
