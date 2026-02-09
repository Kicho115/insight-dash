import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
    status: number;
    expose: boolean;
    details?: Record<string, unknown>;

    constructor(
        message: string,
        status: number,
        expose = true,
        details?: Record<string, unknown>
    ) {
        super(message);
        this.status = status;
        this.expose = expose;
        this.details = details;
    }
}

const mapKnownError = (error: Error): ApiError | null => {
    if (error.message === "Authentication required") {
        return new ApiError("Unauthorized", 401, true);
    }
    if (error.message.toLowerCase().includes("permission")) {
        return new ApiError("Forbidden", 403, true);
    }
    if (error.message.toLowerCase().includes("not found")) {
        return new ApiError("Not Found", 404, true);
    }
    return null;
};

export const handleApiError = (error: unknown) => {
    if (error instanceof ApiError) {
        return NextResponse.json(
            {
                error: error.expose ? error.message : "Internal Server Error",
                ...(error.details ? { details: error.details } : {}),
            },
            { status: error.status }
        );
    }

    if (error instanceof ZodError) {
        return NextResponse.json(
            { error: "Invalid request body", details: error.flatten() },
            { status: 400 }
        );
    }

    if (error instanceof Error) {
        const mapped = mapKnownError(error);
        if (mapped) {
            return NextResponse.json(
                {
                    error: mapped.message,
                    ...(mapped.details ? { details: mapped.details } : {}),
                },
                { status: mapped.status }
            );
        }
    }

    return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
    );
};
