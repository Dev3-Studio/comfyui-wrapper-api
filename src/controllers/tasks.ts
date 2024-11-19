import { Request, Response } from 'express';
import { zTaskCreate } from '../lib/zodSchemas';
import { z } from 'zod';
import { fromError } from 'zod-validation-error';
import * as services from '../services/tasks';

export async function postTask(req: Request, res: Response) {
	const { body } = req;

	const parse = zTaskCreate.safeParse(body);
	if (!parse.success) {
		const error = fromError(parse.error);
		return res.status(400).json(error.toString());
	}

	const task = parse.data;

	try {
		const result = await services.createTask(task);
		return res.status(201).json(result);
	}
	catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'Internal Server Error' });
	}
}

export async function getTaskStatus(req: Request, res: Response) {
	const { id } = req.params;

	const parse = z.string().uuid().safeParse(id);
	if (!parse.success) {
		const error = fromError(parse.error);
		return res.status(400).json(error.toString());
	}

	const taskId = parse.data;

	try {
		const result = await services.getTaskStatus(taskId);
		return res.status(200).json(result);
	}
	catch (err: unknown) {
		if (err instanceof Error && err.message === 'NOT_FOUND') {
			return res.status(404).json({ error: 'Not Found' });
		}
	}
}

export async function getTaskResult(req: Request, res: Response) {
	const { id } = req.params;

	const parse = z.string().uuid().safeParse(id);
	if (!parse.success) {
		const error = fromError(parse.error);
		return res.status(400).json(error.toString());
	}

	const taskId = parse.data;

	try {
		const result = await services.getTaskResult(taskId);
		return res.type('png').status(200).send(result);
	}
	catch (err: unknown) {
		if (err instanceof Error && err.message === 'NOT_FOUND') {
			return res.status(404).json({ error: 'Not Found' });
		}
		if (err instanceof Error && err.message === 'NOT_COMPLETED') {
			return res.status(404).json({ error: 'Image Not Found' });
		}
	}
}

export async function optimisePrompt(req: Request, res: Response) {

	const { prompt } = req.body;

	const parse = z.string().safeParse(prompt);
	if (!parse.success) {
		const error = fromError(parse.error);
		return res.status(400).json(error.toString());
	}

	const promptText = parse.data;

	try {
		const result = await services.optimisePrompt(promptText);
		return res.status(200).json(result);
	}
	catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'Internal Server Error' });
	}

}