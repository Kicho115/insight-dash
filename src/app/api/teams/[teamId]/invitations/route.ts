import { NextResponse } from "next/server";
import { requireServerAuth } from "@/lib/serverAuth";
import { getUserById } from "@/data/users";
import { getTeamById } from "@/data/teams";
import { createInvitation } from "@/data/invitations";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ teamId: string }> }
) {
    try {
        const user = await requireServerAuth();
        const { teamId } = await params;
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: "Email is required." },
                { status: 400 }
            );
        }

        // Check if the inviter has permission
        const team = await getTeamById(teamId, user.uid);
        const inviterRole = team.members.find(
            (m) => m.userId === user.uid
        )?.role;
        if (inviterRole !== "owner" && inviterRole !== "admin") {
            throw new Error("You do not have permission to invite members.");
        }

        const inviterProfile = await getUserById(user.uid);
        await createInvitation(teamId, inviterProfile, email);

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        const message = (error as Error).message;
        console.error("Error creating invitation:", error);
        if (message.includes("permission")) {
            return NextResponse.json({ error: message }, { status: 403 });
        }
        if (message.includes("not found")) {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        if (message.includes("already")) {
            return NextResponse.json({ error: message }, { status: 409 });
        }
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
