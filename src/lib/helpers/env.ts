export const requireEnv = (key: string): string => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing environment variable: ${key}`);
    }
    return value;
};

export const optionalEnv = (key: string): string | undefined =>
    process.env[key];
