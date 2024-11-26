import { getPromptJob, queuePromptJob } from '../jobs/prompts';
import { Prompt, PromptCreate, PromptStatus } from '../lib/zodSchemas';
import { optimisePrompt } from '../core/llm';
import { getRandomSeed } from '../utils/getRandomSeed';
import { AspectRatio, Workflows } from '../core/workflows';
import { getUuidV4 } from '../utils/getUuidV4';

export async function createPrompt(prompt: PromptCreate): Promise<Prompt> {
    const { text, detailText, workflowOverride, aspectRatioOverride, seedOverride } = prompt;
    const optimisedPrompt = await optimisePrompt(text, {
        detailText,
    });
    const workflow = workflowOverride || optimisedPrompt.workflow || Workflows.Realistic;
    const detailedText = optimisedPrompt.detailedText;
    const aspectRatio = aspectRatioOverride || optimisedPrompt.aspectRatio || undefined;
    const seed = seedOverride || getRandomSeed();
    const job = await queuePromptJob({
        workflow,
        text: detailedText || text,
        aspectRatio,
        seed,
        clientId: getUuidV4(),
    });
    return {
        id: job.promptId!,
        aspectRatio: aspectRatio || AspectRatio.Square,
        text: detailedText || prompt.text,
        detailedText: detailedText || undefined,
        seed,
        workflow,
    };
}

export async function getPromptStatus(id: string): Promise<PromptStatus> {
    const prompt = getPromptJob(id);
    if (!prompt) {
        throw new Error('NOT_FOUND');
    }
    const progress = prompt.progress;
    
    if (!prompt.promptId || !progress) {
        throw new Error('NOT_FOUND');
    }
    return {
        id,
        progress: progress.value,
        status: progress.value === 1 ? 'completed' : 'pending',
        statusMessage: progress.status,
    };
}

export async function getPromptResult(id: string): Promise<Buffer> {
    const prompt = getPromptJob(id);
    if (!prompt) {
        throw new Error('NOT_FOUND');
    }
    const progress = prompt.progress;
    if (progress && progress.value !== 1) {
        throw new Error('NOT_COMPLETED');
    }
    
    return await prompt.getResult();
}