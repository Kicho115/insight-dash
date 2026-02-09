import { z } from "zod";

export const chatMessageSchema = z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string().min(1),
});

export const aiRequestSchema = z
    .object({
        messages: z.array(chatMessageSchema).min(1),
        fileId: z.string().uuid().optional(),
    })
    .strict();

export const createFileUploadSchema = () =>
    z
        .object({
            fileName: z.string().min(1).max(255),
            fileType: z.string().min(1).max(200),
            fileSize: z.number().int().nonnegative(),
            visibility: z.string().min(1).max(128),
            displayName: z.string().max(255).optional(),
        })
        .strict();

export const fileProcessSchema = z
    .object({
        filePath: z.string().min(1),
        fileName: z.string().min(1),
    })
    .strict();

export const fileVisibilitySchema = z
    .object({
        visibility: z.string().min(1).max(128),
    })
    .strict();

export const sessionLoginSchema = z
    .object({
        idToken: z.string().min(1),
    })
    .strict();
