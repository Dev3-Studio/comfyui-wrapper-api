import { z } from 'zod';

export const zTask = z.object({
    id: z.string().uuid(),
    prompt: z.string(),
});

export const zTaskCreate = zTask.pick({ prompt: true });

export const zTaskStatus = z.object({
    id: z.string().uuid(),
    status: z.enum(['pending', 'completed']),
    progress: z.number().int().min(0).max(1),
});

export const zTaskResult = z.object({
    id: z.string().uuid(),
    prompt: z.string(),
    result: z.instanceof(Buffer),
});