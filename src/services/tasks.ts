import { getPromptJob, queuePromptJob } from '../jobs';
import { Task, TaskCreate, TaskStatus } from '../lib/zodSchemas';
import { optimisePrompt } from '../core/llm';
import { getRandomSeed } from '../utils/getRandomSeed';
import { AspectRatio, Workflows } from '../core/workflows';
import { getUuidV4 } from '../utils/getUuidV4';

export async function createTask(task: TaskCreate): Promise<Task> {
    const { prompt, detailPrompt, workflowOverride, aspectRatioOverride, seedOverride } = task;
    const optimisedPrompt = await optimisePrompt(prompt, {
        detailPrompt,
    });
    const workflow = workflowOverride || optimisedPrompt.workflow || Workflows.Realistic;
    const detailedPrompt = optimisedPrompt.detailedPrompt;
    const aspectRatio = aspectRatioOverride || optimisedPrompt.aspectRatio || undefined;
    const keyPhrases = optimisedPrompt.keyPhrases ?? undefined;
    const seed = seedOverride || getRandomSeed();
    const job = await queuePromptJob({
        workflow,
        prompt: detailedPrompt || prompt,
        aspectRatio,
        seed,
        keyPhrases: keyPhrases,
        clientId: getUuidV4(),
    });
    return {
        id: job.promptId!,
        aspectRatio: aspectRatio || AspectRatio.Square,
        prompt: detailedPrompt || prompt,
        detailedPrompt: detailedPrompt || undefined,
        seed,
        workflow,
    };
}

export async function getTaskStatus(id: string): Promise<TaskStatus> {
    const task = getPromptJob(id);
    if (!task) {
        throw new Error('NOT_FOUND');
    }
    const progress = task.progress;
    
    if (!task.promptId || !progress) {
        throw new Error('NOT_FOUND');
    }
    return {
        id,
        progress: progress.value,
        status: progress.value === 1 ? 'completed' : 'pending',
        statusMessage: progress.status,
    };
}

export async function getTaskResult(id: string): Promise<Buffer> {
    const task = getPromptJob(id);
    if (!task) {
        throw new Error('NOT_FOUND');
    }
    const progress = task.progress;
    if (progress && progress.value !== 1) {
        throw new Error('NOT_COMPLETED');
    }
    
    return await task.getResult();
}