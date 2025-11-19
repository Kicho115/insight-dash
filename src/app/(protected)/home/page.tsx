import { requireServerAuth } from "@/lib/serverAuth";
import { getFilesForUser } from "@/data/files";
import { HomeClient } from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const user = await requireServerAuth();

    const files = await getFilesForUser(user.uid);

    // Serialize dates and get recent files (last 5)
    const recentFiles = files
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 5)
        .map((file) => ({
            ...file,
            createdAt: file.createdAt.toISOString(),
            updatedAt: file.updatedAt.toISOString(),
        }));

    // Get files that need attention (Error or Action Required)
    const filesNeedingAttention = files
        .filter((file) => file.status === "Error" || file.status === "Action Required")
        .map((file) => ({
            ...file,
            createdAt: file.createdAt.toISOString(),
            updatedAt: file.updatedAt.toISOString(),
        }));

    return (
        <HomeClient
            recentFiles={recentFiles}
            filesNeedingAttention={filesNeedingAttention}
        />
    );
}
