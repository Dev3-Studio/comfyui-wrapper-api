import { z } from 'zod';
import { Layout, Workflows } from '../core/workflows';

export const zPrompt = z.object({
    clientId: z.string().uuid(),
    promptId: z.string().uuid(),
    text: z.string(),
    enhancedText: z.string().optional(),
    workflow: z.nativeEnum(Workflows),
    layout: z.nativeEnum(Layout),
    seed: z.number().int(),
});

export const zPromptCreate = z.object({
    clientId: z.string().uuid(),
    text: z.string(),
    enhanceText: z.boolean().optional(),
    workflowOverride: z.nativeEnum(Workflows).optional(),
    layoutOverride: z.nativeEnum(Layout).optional(),
    seedOverride: z.number().int().optional(),
});

export const zPromptStatus = z.object({
    promptId: z.string().uuid(),
    status: z.enum(['pending', 'completed']),
    statusMessage: z.string(),
    progress: z.number().int().min(0).max(1),
});

export const zPromptResult = z.object({
    promptId: z.string().uuid(),
    text: z.string(),
    result: z.instanceof(Buffer),
});

export type Prompt = z.infer<typeof zPrompt>;
export type PromptCreate = z.infer<typeof zPromptCreate>;
export type PromptStatus = z.infer<typeof zPromptStatus>;
export type PromptResult = z.infer<typeof zPromptResult>;