import { queuePromptJob } from '../jobs/prompts';
import { Prompt, PromptCreate, PromptResult } from '../lib/zodSchemas';
import { optimisePrompt } from '../core/llm';
import { getRandomSeed } from '../utils/getRandomSeed';
import { Layout, PromptStatus, Workflows } from '../core/workflows';
import { db } from '../db';
import { promptsTable, resultsTable } from '../db/schema';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';

export async function createPrompt(prompt: PromptCreate): Promise<Prompt> {
    const { text, clientId, workflowOverride, layoutOverride, seedOverride } = prompt;
    
    let workflow = workflowOverride || Workflows.Realistic;
    let layout = layoutOverride || Layout.Square;
    let seed = seedOverride || getRandomSeed();
    let enhancedText: string | undefined;
    
    try {
        const optimisedPrompt = await optimisePrompt(prompt);
        enhancedText = optimisedPrompt.enhancedText;
        if (!workflowOverride && optimisedPrompt.workflow) workflow = optimisedPrompt.workflow;
        if (!layoutOverride && optimisedPrompt.layout) layout = optimisedPrompt.layout;
    } catch (error) {
        console.error(error);
    }
    
    const job = await queuePromptJob({
        clientId,
        workflow,
        text,
        enhancedText,
        layout,
        seed,
    });
    
    return {
        clientId,
        promptId: job.promptId!,
        layout: layout || Layout.Square,
        text: prompt.text,
        enhancedText: enhancedText ?? null,
        seed,
        workflow,
        createdAt: job.startedAt?.toISOString() ?? new Date().toISOString(),
    };
}

interface GetAllPromptResultsFilters {
    clientId?: string;
    status?: PromptStatus;
    limit?: number;
}

export async function getAllPromptResults(filters: GetAllPromptResultsFilters): Promise<PromptResult[]> {
    const { clientId, status, limit } = filters;
    let query = db
        .select({
            promptId: promptsTable.id,
            clientId: promptsTable.clientId,
            text: promptsTable.text,
            enhancedText: promptsTable.enhancedText,
            workflow: promptsTable.workflow,
            layout: promptsTable.layout,
            seed: promptsTable.seed,
            status: resultsTable.status,
            statusMessage: resultsTable.statusMessage,
            progress: resultsTable.progress,
            outputFilename: resultsTable.s3Key,
            createdAt: promptsTable.createdAt,
        })
        .from(promptsTable)
        .orderBy(desc(promptsTable.createdAt))
        .leftJoin(resultsTable, eq(promptsTable.id, resultsTable.promptId))
        .$dynamic();
    
    query = query.limit(limit || 100);
    if (clientId) query = query.where(eq(promptsTable.clientId, clientId));
    if (status) query = query.where(eq(resultsTable.status, status));
    
    const data = await query;
    
    return data.map((row) => ({
        ...row,
        status: z.nativeEnum(PromptStatus).parse(row.status),
        workflow: z.nativeEnum(Workflows).parse(row.workflow),
        layout: z.nativeEnum(Layout).parse(row.layout),
        seed: parseInt(row.seed),
        createdAt: new Date(row.createdAt * 1000).toISOString(),
    }));
}

export async function getPromptResult(promptId: string): Promise<PromptResult> {
    const data = await db
        .select({
            clientId: promptsTable.clientId,
            text: promptsTable.text,
            enhancedText: promptsTable.enhancedText,
            workflow: promptsTable.workflow,
            layout: promptsTable.layout,
            seed: promptsTable.seed,
            status: resultsTable.status,
            statusMessage: resultsTable.statusMessage,
            progress: resultsTable.progress,
            outputFilename: resultsTable.s3Key,
            createdAt: promptsTable.createdAt,
        })
        .from(promptsTable)
        .orderBy(desc(promptsTable.createdAt))
        .leftJoin(resultsTable, eq(promptsTable.id, resultsTable.promptId))
        .limit(1)
        .where(eq(promptsTable.id, promptId));
    
    if (data.length === 0) throw new Error('NOT_FOUND');
    
    return {
        promptId,
        ...data[0],
        status: z.nativeEnum(PromptStatus).parse(data[0].status),
        workflow: z.nativeEnum(Workflows).parse(data[0].workflow),
        layout: z.nativeEnum(Layout).parse(data[0].layout),
        seed: parseInt(data[0].seed),
        createdAt: new Date(data[0].createdAt * 1000).toISOString(),
    };
}