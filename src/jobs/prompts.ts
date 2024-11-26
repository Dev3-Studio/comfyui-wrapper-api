import { AnimeWorkflow, FantasyWorkflow, Layout, RealisticWorkflow, Workflow, Workflows } from '../core/workflows';
import { getRandomSeed } from '../utils/getRandomSeed';
import cron from 'node-cron';
import { db } from '../db';
import { promptsTable, resultsTable } from '../db/schema';
import { z } from 'zod';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getRequiredEnvVar } from '../utils/getRequiredEnvVar';
import { eq } from 'drizzle-orm';
import { getR2Client } from '../utils/getR2Client';

const promptJobs = new Map<string, Workflow>();

interface QueuePromptJobOptions {
    clientId: string;
    text: string;
    enhancedText?: string;
    workflow: Workflows;
    layout: Layout;
    seed: number;
}

export async function queuePromptJob(options: QueuePromptJobOptions) {
    options.seed = options.seed || getRandomSeed();
    const { clientId, text, enhancedText, layout, seed } = options;
    const promptText = enhancedText || text;
    let workflow: Workflow;
    switch (options.workflow) {
        case 'realistic':
            workflow = new RealisticWorkflow(clientId, promptText, { layout, seed });
            break;
        case 'fantasy':
            workflow = new FantasyWorkflow(clientId, promptText, { layout, seed });
            break;
        case 'anime':
            workflow = new AnimeWorkflow(clientId, promptText, { layout, seed });
            break;
        default:
            workflow = new RealisticWorkflow(clientId, promptText, { layout, seed });
            break;
    }
    void await workflow.startExecution();
    const promptId = workflow.promptId;
    if (!promptId) throw new Error('Error while queueing prompt job - promptId is undefined');
    await db.insert(promptsTable).values({
        id: promptId,
        clientId,
        text,
        enhancedText,
        layout,
        workflow: options.workflow,
        seed,
    });
    promptJobs.set(promptId, workflow);
    return workflow;
}

export function getPromptJob(jobId: string) {
    return promptJobs.get(jobId);
}

/** Runs every 5 seconds
 * - Inserts prompt job results into the database
 * - Uploads completed jobs to S3 Bucket on Cloudflare R2
 * - Deletes completed jobs from memory
 */
cron.schedule('*/5 * * * * *', () => {
    const entries = Array.from(promptJobs.entries());
    entries.forEach(async ([key, value]) => {
        const progress = value.progress;
        
        // Insert, on conflict update progress/result
        const status = z.enum(['pending', 'completed']).parse(progress?.value === 1 ? 'completed' : 'pending');
        const { status: statusMessage, value: progressValue, error } = progress ?? {};
        
        await db.insert(resultsTable).values({
            promptId: key,
            status,
            statusMessage,
            progress: progressValue,
            error,
        }).onConflictDoUpdate({
            target: resultsTable.promptId,
            set: {
                status,
                statusMessage,
                progress: progressValue,
                error,
            },
        });
        
        // Upload completed jobs to S3 Bucket
        if (progressValue === 1) {
            const r2Client = getR2Client();
            const bucketName = getRequiredEnvVar('R2_BUCKET_NAME');
            const objectKey = `results/${key}.png`;
            const uploadParams = {
                Bucket: bucketName,
                Key: objectKey,
                Body: await value.getResult(),
                ContentType: 'image/png',
            };
            
            try {
                const command = new PutObjectCommand(uploadParams);
                await r2Client.send(command);
                // Update db with S3 URL
                await db.update(resultsTable)
                    .set({ s3Key: objectKey })
                    .where(eq(resultsTable.promptId, key));
            } catch (e) {
                console.error(`Error while uploading prompt job ${key} to S3: ${e}`);
                // Update db with error
                await db.update(resultsTable)
                    .set({ error: 'Could not upload completed image' })
                    .where(eq(resultsTable.promptId, key));
                
                // Delete from memory
                promptJobs.delete(key);
            }
        }
        
        // Clear completed jobs
        if (progressValue === 1) {
            promptJobs.delete(key);
        }
        if (error) {
            console.error(`Error while processing prompt job ${key}: ${error}`);
            promptJobs.delete(key);
        }
    });
});
