import { Request, Response } from 'express';
import { z } from 'zod';
import { fromError } from 'zod-validation-error';
import * as services from '../services/outputs';

export async function getOutput(req: Request, res: Response) {
    const { id } = req.params;
    
    const parse = z.string().uuid().safeParse(id);
    if (!parse.success) {
        const error = fromError(parse.error);
        return res.status(400).json(error.toString());
    }
    
    const outputId = parse.data;
    
    try {
        const result = await services.getOutput(outputId);
        return res.status(200).send(result);
    } catch (err: unknown) {
        if (err instanceof Error && err.message === 'NOT_FOUND') {
            return res.status(404).json({ error: 'Not Found' });
        }
    }
}