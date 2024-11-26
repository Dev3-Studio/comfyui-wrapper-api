import { queuePromptJob } from '../jobs/prompts';
import { Prompt, PromptCreate, PromptStatus } from '../lib/zodSchemas';
import { optimisePrompt } from '../core/llm';
import { getRandomSeed } from '../utils/getRandomSeed';
import { Layout, Workflows } from '../core/workflows';
import { db } from '../db';
import { resultsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getR2Client } from '../utils/getR2Client';
import { getRequiredEnvVar } from '../utils/getRequiredEnvVar';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

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
        enhancedText: enhancedText,
        seed,
        workflow,
    };
}

export async function getPromptStatus(promptId: string): Promise<PromptStatus> {
    const data = await db
        .select({
            promptId: resultsTable.promptId,
            status: resultsTable.status,
            statusMessage: resultsTable.statusMessage,
            progress: resultsTable.progress,
        })
        .from(resultsTable)
        .limit(1)
        .where(eq(resultsTable.promptId, promptId));
    
    if (data.length === 0) throw new Error('NOT_FOUND');
    return data[0];
}

export async function getPromptResult(promptId: string): Promise<Buffer> {
    const [{ r2Key }] = await db
        .select({
            r2Key: resultsTable.s3Key,
        })
        .from(resultsTable)
        .limit(1)
        .where(eq(resultsTable.promptId, promptId));
    if (!r2Key) throw new Error('NOT_FOUND');
    
    const r2Client = getR2Client();
    const bucketName = getRequiredEnvVar('R2_BUCKET_NAME');
    
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: r2Key,
        });
        const response = await r2Client.send(command);
        const streamToBuffer = async (stream: Readable) => {
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        };
        
        return await streamToBuffer(response.Body as Readable);
    } catch (e) {
        console.error(`Error while downloading prompt job ${promptId} from S3: ${e}`);
        throw new Error('NOT_FOUND');
    }
}