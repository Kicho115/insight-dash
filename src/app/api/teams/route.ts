import { NextResponse } from "next/server";
import { requireServerAuth } from "@/lib/serverAuth";
import { getUserById } from "@/data/users";
import { createTeam, getTeamsForUser } from "@/data/teams";

/**
 * @route GET /api/teams
 * @description Fetches all teams for the authenticated user.
 */
export async function GET() {
    try {
        const user = await requireServerAuth();
        const teams = await getTeamsForUser(user.uid);

        return NextResponse.json(teams);
    } catch (error) {
        console.error("Error fetching teams:", error);
        if ((error as Error).message === "Authentication required") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

/**
 * @route POST /api/teams
 * @description Creates a new team with the authenticated user as the owner.
 */
export async function POST(request: Request) {
    try {
        const user = await requireServerAuth();
        const { name } = await request.json();

        if (!name) {
            return NextResponse.json(
                { error: "Team name is required." },
                { status: 400 }
            );
        }

        // We need the full user profile to set as the first member
        const userProfile = await getUserById(user.uid);

        const newTeam = await createTeam(name, userProfile);

        return NextResponse.json(newTeam, { status: 201 });
    } catch (error) {
        console.error("Error creating team:", error);
        const message = (error as Error).message;
        if (message === "Authentication required") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        if (
            message === "A team with this name already exists." ||
            message === "Team name cannot be empty." ||
            message === "Team name cannot exceed 25 characters."
        ) {
            return NextResponse.json({ error: message }, { status: 409 });
        }
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
