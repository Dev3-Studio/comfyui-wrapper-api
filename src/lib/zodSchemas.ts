import { z } from 'zod';

export enum workflows {
	'Anime',
	'Photorealistic', // https://civitai.com/models/796382/ultrarealistic-lora-project
	'Cartoon',
	'Art',
	'Abstract',
	'Pixel',
	'PixelSorting', // https://civitai.com/models/57963/pixel-sorting
	'Base', // https://civitai.com/models/215538?modelVersionId=317260 / https://civitai.com/models/141592/pixelwave
	'Landscape',
	'Animal'
}

export const options = z.object({
	optimisePrompt: z.boolean().optional(),
	faceDetailer: z.boolean().optional(),
	workflowOverride: z.nativeEnum(workflows).optional(),
	outputResolution: z.number().int().min(1024).max(8192).optional(),
});

export const zTask = z.object({
	id: z.string().uuid(),
	prompt: z.string(),
	options: options.optional(),
});

export const zTaskCreate = zTask.omit({ id: true });
export type TaskCreate = z.infer<typeof zTaskCreate>;

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