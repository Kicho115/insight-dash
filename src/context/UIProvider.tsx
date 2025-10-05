"use client";

import { createContext, useState, useContext, ReactNode } from "react";

interface UIContextType {
    isUploadModalOpen: boolean;
    openUploadModal: () => void;
    closeUploadModal: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

/**
 * @hook useUI
 * @description A custom hook to access and control shared UI state, like modals.
 */
export const useUI = () => {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error("useUI must be used within a UIProvider");
    }
    return context;
};

/**
 * @component UIProvider
 * @description Provides shared UI state and functions to its children components.
 * This is the central hub for managing global UI elements like the upload modal.
 */
export const UIProvider = ({ children }: { children: ReactNode }) => {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const openUploadModal = () => setIsUploadModalOpen(true);
    const closeUploadModal = () => setIsUploadModalOpen(false);

    const value = {
        isUploadModalOpen,
        openUploadModal,
        closeUploadModal,
    };

    return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};
