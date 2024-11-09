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
        return res.status(400).json(error);
    }

    const task = parse.data;

    try {
        const result = await services.createTask(task.prompt);
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function getTaskStatus(req: Request, res: Response) {
    const { id } = req.params;

    const parse = z.string().uuid().safeParse(id);
    if (!parse.success) {
        const error = fromError(parse.error);
        return res.status(400).json(error);
    }

    const taskId = parse.data;

    try {
        const result = await services.getTaskStatus(taskId);
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}