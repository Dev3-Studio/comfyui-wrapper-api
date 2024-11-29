import { z } from 'zod';
import { Layout, Workflows } from '../core/workflows';

export const zPrompt = z.object({
    clientId: z.string().uuid(),
    promptId: z.string().uuid(),
    text: z.string(),
    enhancedText: z.string().nullable(),
    workflow: z.nativeEnum(Workflows),
    layout: z.nativeEnum(Layout),
    seed: z.number().int(),
    createdAt: z.string().datetime(),
});

export const zPromptCreate = z.object({
    clientId: z.string().uuid(),
    text: z.string(),
    enhanceText: z.boolean().optional(),
    workflowOverride: z.nativeEnum(Workflows).optional(),
    layoutOverride: z.nativeEnum(Layout).optional(),
    seedOverride: z.number().int().optional(),
});

export const zStatus = z.enum(['pending', 'completed', 'failed']);

export const zPromptResult = z.object({
    clientId: z.string().uuid(),
    promptId: z.string().uuid(),
    text: z.string(),
    enhancedText: z.string().nullable(),
    workflow: z.nativeEnum(Workflows),
    layout: z.nativeEnum(Layout),
    seed: z.number().int(),
    status: zStatus.nullable(),
    statusMessage: z.string().nullable(),
    progress: z.number().int().min(0).max(1).nullable(),
    outputFilename: z.string().nullable(),
    createdAt: z.string().datetime(),
});

export type Prompt = z.infer<typeof zPrompt>;
export type PromptCreate = z.infer<typeof zPromptCreate>;
export type Status = z.infer<typeof zStatus>;
export type PromptResult = z.infer<typeof zPromptResult>;