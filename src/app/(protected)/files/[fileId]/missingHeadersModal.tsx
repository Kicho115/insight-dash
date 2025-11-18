"use client";

// React
import { useState } from "react";

// Next.js
import { useRouter } from "next/navigation";

// Components
import { ConfirmationModal } from "@/components/confirmationModal";

// Services
import { deleteFile } from "@/services/files";

interface Props {
    fileId: string;
}

export const MissingHeadersModal = ({ fileId }: Props) => {
    const [isOpen, setIsOpen] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleResumeFileProcessing = async () => {
        await fetch(`/api/files/${fileId}/generate-dashboard`, {
            method: "POST",
        });
        setIsOpen(false);
    };

    return (
        <ConfirmationModal
            title="Missing Headers"
            message="We could not find the headers in your file. Do you still want to continue? This may lead to incorrect data processing."
            confirmText="No, delete file."
            cancelText="Continue"
            onConfirm={() => {
                setIsDeleting(true);
                deleteFile(fileId)
                    .then(() => {
                        setIsDeleting(false);
                        setIsOpen(false);
                        router.replace("/files");
                    })
                    .catch(() => {
                        // TODO: handle error
                        router.push("/files");
                    });
            }}
            isOpen={isOpen}
            onClose={handleResumeFileProcessing}
            isLoading={isDeleting}
            requireAction
        />
    );
};
