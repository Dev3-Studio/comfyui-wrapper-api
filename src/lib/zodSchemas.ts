import { z } from 'zod';
import { AspectRatio, Workflows } from '../core/workflows';

export const zPrompt = z.object({
    id: z.string().uuid(),
    text: z.string(),
    detailedText: z.string().optional(),
    workflow: z.nativeEnum(Workflows),
    aspectRatio: z.nativeEnum(AspectRatio),
    seed: z.number().int(),
});

export const zPromptCreate = z.object({
    text: z.string(),
    detailText: z.boolean().optional(),
    workflowOverride: z.nativeEnum(Workflows).optional(),
    aspectRatioOverride: z.nativeEnum(AspectRatio).optional(),
    seedOverride: z.number().int().optional(),
});

export const zPromptStatus = z.object({
    id: z.string().uuid(),
    status: z.enum(['pending', 'completed']),
    statusMessage: z.string(),
    progress: z.number().int().min(0).max(1),
});

export const zPromptResult = z.object({
    id: z.string().uuid(),
    text: z.string(),
    result: z.instanceof(Buffer),
});

export type Prompt = z.infer<typeof zPrompt>;
export type PromptCreate = z.infer<typeof zPromptCreate>;
export type PromptStatus = z.infer<typeof zPromptStatus>;
export type PromptResult = z.infer<typeof zPromptResult>;