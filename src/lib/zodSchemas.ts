import { z } from 'zod';

export const zTask = z.object({
    id: z.string().uuid(),
    prompt: z.string(),
});

export const zTaskCreate = zTask.pick({ prompt: true });

export const zTaskResult = z.object({
    id: z.string().uuid(),
    prompt: z.string(),
    result: z.instanceof(Buffer),
});