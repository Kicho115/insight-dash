export const optionalEnv = (key: string): string | undefined =>
    process.env[key];
