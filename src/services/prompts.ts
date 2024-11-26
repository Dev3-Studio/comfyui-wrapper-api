import { getPromptJob, queuePromptJob } from '../jobs/prompts';
import { Prompt, PromptCreate, PromptStatus } from '../lib/zodSchemas';
import { optimisePrompt } from '../core/llm';
import { getRandomSeed } from '../utils/getRandomSeed';
import { Layout, Workflows } from '../core/workflows';

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
    const prompt = getPromptJob(promptId);
    if (!prompt) {
        throw new Error('NOT_FOUND');
    }
    const progress = prompt.progress;
    
    if (!prompt.promptId || !progress) {
        throw new Error('NOT_FOUND');
    }
    return {
        promptId,
        progress: progress.value,
        status: progress.value === 1 ? 'completed' : 'pending',
        statusMessage: progress.status,
    };
}

export async function getPromptResult(promptId: string): Promise<Buffer> {
    const prompt = getPromptJob(promptId);
    if (!prompt) {
        throw new Error('NOT_FOUND');
    }
    const progress = prompt.progress;
    if (progress && progress.value !== 1) {
        throw new Error('NOT_COMPLETED');
    }
    
    return await prompt.getResult();
}