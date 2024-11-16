import { z } from 'zod';

export enum models {
	'SD-Base',
	'Pony-XL',

}

export const zTask = z.object({
	id: z.string().uuid(),
	prompt: z.string(),
	optimisePrompt: z.boolean().optional(),
	faceDetailer: z.boolean().optional(),
	modelOverride: z.nativeEnum(models).optional(),
});

export const zTaskCreate = zTask.omit({ id: true });

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