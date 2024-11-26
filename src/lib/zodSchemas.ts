import { z } from 'zod';
import { AspectRatio, Workflows } from '../core/workflows';

export const zTask = z.object({
    id: z.string().uuid(),
    prompt: z.string(),
    detailedPrompt: z.string().optional(),
    workflow: z.nativeEnum(Workflows),
    aspectRatio: z.nativeEnum(AspectRatio),
    seed: z.number().int(),
});

export const zTaskCreate = z.object({
    prompt: z.string(),
    detailPrompt: z.boolean().optional(),
    workflowOverride: z.nativeEnum(Workflows).optional(),
    aspectRatioOverride: z.nativeEnum(AspectRatio).optional(),
    seedOverride: z.number().int().optional(),
});

export const zTaskStatus = z.object({
    id: z.string().uuid(),
    status: z.enum(['pending', 'completed']),
    statusMessage: z.string(),
    progress: z.number().int().min(0).max(1),
});

export const zTaskResult = z.object({
    id: z.string().uuid(),
    prompt: z.string(),
    result: z.instanceof(Buffer),
});

export type Task = z.infer<typeof zTask>;
export type TaskCreate = z.infer<typeof zTaskCreate>;
export type TaskStatus = z.infer<typeof zTaskStatus>;
export type TaskResult = z.infer<typeof zTaskResult>;