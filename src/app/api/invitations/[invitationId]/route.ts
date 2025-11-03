import { NextResponse } from "next/server";
import { requireServerAuth } from "@/lib/serverAuth";
import { getUserById } from "@/data/users";
import { acceptInvitation, declineInvitation } from "@/data/invitations";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ invitationId: string }> }
) {
    try {
        const user = await requireServerAuth();
        const { invitationId } = await params;
        const { action } = await request.json(); // action: "accept" or "decline"

        // We need the full user profile to pass to the DAL functions
        const userProfile = await getUserById(user.uid);

        if (action === "accept") {
            await acceptInvitation(invitationId, userProfile);
        } else if (action === "decline") {
            // --- IMPLEMENTED ---
            await declineInvitation(invitationId, userProfile);
            // --- END ---
        } else {
            return NextResponse.json(
                { error: "Invalid action." },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        const message = (error as Error).message;
        console.error("Error processing invitation action:", error);
        if (message.includes("not found")) {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        if (message.includes("permission")) {
            return NextResponse.json({ error: message }, { status: 403 });
        }
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
