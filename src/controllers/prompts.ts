import { Request, Response } from 'express';
import { zPromptCreate, zStatus } from '../lib/zodSchemas';
import { z } from 'zod';
import { fromError } from 'zod-validation-error';
import * as services from '../services/prompts';

export async function postPrompt(req: Request, res: Response) {
    const { body } = req;
    
    const parse = zPromptCreate.safeParse(body);
    if (!parse.success) {
        const error = fromError(parse.error);
        return res.status(400).json({ error: error.toString() });
    }
    
    const prompt = parse.data;
    
    try {
        const result = await services.createPrompt(prompt);
        return res.status(201).json(result);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function getAllPromptResults(req: Request, res: Response) {
    const query = req.query;
    
    const parse = z.object({
        clientId: z.string().uuid().optional(),
        status: zStatus.optional(),
        limit: z.number().int().positive().optional(),
    }).safeParse(query);
    if (!parse.success) {
        const error = fromError(parse.error);
        return res.status(400).json({ error: error.toString() });
    }
    
    const filters = parse.data;
    
    try {
        const result = await services.getAllPromptResults(filters);
        return res.status(200).send(result);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function getPromptResult(req: Request, res: Response) {
    const { id } = req.params;
    
    const parse = z.string().uuid().safeParse(id);
    if (!parse.success) {
        const error = fromError(parse.error);
        return res.status(400).json({ error: error.toString() });
    }
    
    const promptId = parse.data;
    
    try {
        const result = await services.getPromptResult(promptId);
        return res.status(200).send(result);
    } catch (err: unknown) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return res.status(404).json({ error: 'Not Found' });
        }
        if (err instanceof Error && err.message === 'NOT_COMPLETED') {
            return res.status(404).json({ error: 'Image Not Found' });
        }
    }
}