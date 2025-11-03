import { NextResponse, NextRequest } from "next/server";
import { requireServerAuth } from "@/lib/serverAuth";
import { removeMemberFromTeam, updateMemberRole } from "@/data/teams";
import { TeamMemberRole } from "@/types/user";

interface RouteContext {
    params: Promise<{
        teamId: string;
        userId: string;
    }>;
}

/**
 * @route DELETE /api/teams/[teamId]/members/[userId]
 * @description Removes a member from a team.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
    try {
        const user = await requireServerAuth();
        const { teamId, userId: memberToRemoveId } = await context.params;

        if (user.uid === memberToRemoveId) {
            return NextResponse.json(
                { error: "You cannot remove yourself." },
                { status: 400 }
            );
        }

        await removeMemberFromTeam(teamId, memberToRemoveId, user.uid);

        return NextResponse.json({ success: true, message: "Member removed." });
    } catch (error) {
        const message = (error as Error).message;
        console.error("Error removing member:", error);
        if (
            message.includes("permission") ||
            message.includes("Cannot remove")
        ) {
            return NextResponse.json({ error: message }, { status: 403 });
        }
        if (message.includes("not found")) {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

/**
 * @route PATCH /api/teams/[teamId]/members/[userId]
 * @description Updates a member's role.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const user = await requireServerAuth();
        const { teamId, userId: memberToUpdateId } = await context.params;
        const { role } = (await request.json()) as { role: TeamMemberRole };

        if (!role || (role !== "admin" && role !== "member")) {
            return NextResponse.json(
                { error: "Invalid role specified." },
                { status: 400 }
            );
        }

        if (user.uid === memberToUpdateId) {
            return NextResponse.json(
                { error: "You cannot change your own role." },
                { status: 400 }
            );
        }

        await updateMemberRole(teamId, memberToUpdateId, role, user.uid);

        return NextResponse.json({
            success: true,
            message: "Member role updated.",
        });
    } catch (error) {
        const message = (error as Error).message;
        console.error("Error updating role:", error);
        if (
            message.includes("permission") ||
            message.includes("Cannot change")
        ) {
            return NextResponse.json({ error: message }, { status: 403 });
        }
        if (message.includes("not found")) {
            return NextResponse.json({ error: message }, { status: 404 });
        }
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
