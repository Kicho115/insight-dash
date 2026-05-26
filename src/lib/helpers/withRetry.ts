function isTransientError(err: unknown): boolean {
    if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        return (
            msg.includes("503") ||
            msg.includes("unavailable") ||
            msg.includes("high demand") ||
            msg.includes("429") ||
            msg.includes("rate limit")
        );
    }
    return false;
}

export async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (attempt === maxAttempts || !isTransientError(err)) throw err;
            const delay = 2000 * attempt;
            await new Promise((res) => setTimeout(res, delay));
        }
    }
    throw new Error("Unreachable");
}
