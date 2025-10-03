"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import styles from "./layout.module.css";

// Import Providers and Components
import { UIProvider, useUI } from "@/context/UIProvider";
import { FilesProvider } from "@/context/FilesProvider";
import { Sidebar } from "@/components/sidebar";
import { Modal } from "@/components/modal";
import { UploadForm } from "@/components/uploadForm";

// This small component consumes the UI context to render the modal.
// This is a performance optimization: only this component re-renders when the modal opens/closes.
const AppModalController = () => {
    const { isUploadModalOpen, closeUploadModal } = useUI();
    return (
        <Modal isOpen={isUploadModalOpen} onClose={closeUploadModal}>
            {/* Pass the close function to the form so it can close itself on success */}
            <UploadForm onUploadSuccess={closeUploadModal} />
        </Modal>
    );
};

export default function ProtectedLayout({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/sign-in");
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return <div>Verifying session...</div>; // Or a proper spinner component
    }

    // The main layout now wraps everything in the necessary providers.
    return (
        <UIProvider>
            <FilesProvider>
                <div className={styles.container}>
                    <Sidebar />
                    <main className={styles.content}>{children}</main>
                    {/* The Modal's visibility is now controlled by the UIContext */}
                    <AppModalController />
                </div>
            </FilesProvider>
        </UIProvider>
    );
}
