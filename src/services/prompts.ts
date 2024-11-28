import { queuePromptJob } from '../jobs/prompts';
import { Prompt, PromptCreate, PromptResult, Status } from '../lib/zodSchemas';
import { optimisePrompt } from '../core/llm';
import { getRandomSeed } from '../utils/getRandomSeed';
import { Layout, Workflows } from '../core/workflows';
import { db } from '../db';
import { promptsTable, resultsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export async function createPrompt(prompt: PromptCreate): Promise<Prompt> {
    const { text, clientId, workflowOverride, layoutOverride, seedOverride } = prompt;
    const { workflow: optimisedWorkflow, enhancedText, layout: optimisedLayout } = await optimisePrompt(prompt);
    
    const workflow = workflowOverride || optimisedWorkflow || Workflows.Realistic;
    const layout = layoutOverride || optimisedLayout || Layout.Square;
    const seed = seedOverride || getRandomSeed();
    
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
    };
}

interface GetAllPromptResultsFilters {
    clientId?: string;
    status?: Status;
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
            resultS3Key: resultsTable.s3Key,
        })
        .from(promptsTable)
        .leftJoin(resultsTable, eq(promptsTable.id, resultsTable.promptId))
        .$dynamic();
    
    query = query.limit(limit || 100);
    if (clientId) query = query.where(eq(promptsTable.clientId, clientId));
    if (status) query = query.where(eq(resultsTable.status, status));
    
    const data = await query;
    return data.map((row) => ({
        ...row,
        workflow: z.nativeEnum(Workflows).parse(row.workflow),
        layout: z.nativeEnum(Layout).parse(row.layout),
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
            resultS3Key: resultsTable.s3Key,
        })
        .from(promptsTable)
        .leftJoin(resultsTable, eq(promptsTable.id, resultsTable.promptId))
        .limit(1)
        .where(eq(promptsTable.id, promptId));
    
    if (data.length === 0) throw new Error('NOT_FOUND');
    
    return {
        promptId,
        ...data[0],
        workflow: z.nativeEnum(Workflows).parse(data[0].workflow),
        layout: z.nativeEnum(Layout).parse(data[0].layout),
    };
}