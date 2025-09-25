// Import components
"use client";

import { useState, ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth"; // Assuming this is your auth hook
import styles from "./layout.module.css";

// Import your components
import { FilesProvider } from "@/context/FilesProvider";
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
        return <div>Verifying session...</div>;
    }

    // Callback to close the modal upon successful upload
    const handleUploadSuccess = () => {
        setIsUploadModalOpen(false);
    };

    return (
        <div className={styles.container}>
            <FilesProvider>
                <Sidebar onUploadClick={() => setIsUploadModalOpen(true)} />

                <main className={styles.content}>{children}</main>

                <Modal
                    isOpen={isUploadModalOpen}
                    onClose={() => setIsUploadModalOpen(false)}
                >
                    <UploadForm onUploadSuccess={handleUploadSuccess} />
                </Modal>
            </FilesProvider>
        </div>
    );
}
