import { z } from "zod";
import { ApiError } from "./errorHandler";

export const parseJson = async <T>(
    request: Request,
    schema: z.ZodType<T>
): Promise<T> => {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        throw new ApiError("Invalid JSON body", 400, true);
    }

    const result = schema.safeParse(body);
    if (!result.success) {
        throw new ApiError("Invalid request body", 400, true, {
            issues: result.error.flatten(),
        });
    }

    return result.data;
};
