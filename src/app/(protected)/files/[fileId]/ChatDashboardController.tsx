"use client";

import { useEffect, useRef, useState } from "react";
import ChatWidget from "@/components/ChatWidget";
import DashboardBottomSheet from "@/components/DashboardBottomSheet";
import { useChat } from "@/hooks/useChat";

type Props = {
    fileId: string;
};

export default function ChatDashboardController({ fileId }: Props) {
    const {
        messages,
        input,
        sending,
        error,
        canSend,
        setInput,
        handleSubmit,
        retryChat,
        pendingDashboard,
        dashboardLoading,
        dashboardError,
        clearDashboard,
        retryDashboard,
    } = useChat(fileId);

    const [sheetOpen, setSheetOpen] = useState(false);

    // Auto-open the sheet when a new dashboard finishes loading
    const prevLoadingRef = useRef(false);
    useEffect(() => {
        if (prevLoadingRef.current && !dashboardLoading && pendingDashboard) {
            setSheetOpen(true);
        }
        prevLoadingRef.current = dashboardLoading;
    }, [dashboardLoading, pendingDashboard]);

    function handleOpenDashboard() {
        setSheetOpen(true);
    }

    function handleCloseSheet() {
        setSheetOpen(false);
    }

    return (
        <>
            <ChatWidget
                fileId={fileId}
                chatState={{
                    messages,
                    input,
                    sending,
                    error,
                    canSend,
                    setInput,
                    handleSubmit,
                    retryChat,
                }}
                dashboardLoading={dashboardLoading}
                dashboardError={dashboardError}
                hasDashboard={!!pendingDashboard}
                onOpenDashboard={handleOpenDashboard}
                onRetryDashboard={() => void retryDashboard()}
            />

            {(sheetOpen || dashboardLoading) && (
                <DashboardBottomSheet
                    dashboard={pendingDashboard}
                    loading={dashboardLoading}
                    onClose={handleCloseSheet}
                />
            )}
        </>
    );
}
