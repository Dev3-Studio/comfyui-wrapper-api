import { AnimeWorkflow, AspectRatio, FantasyWorkflow, RealisticWorkflow, Workflow, Workflows } from '../core/workflows';
import crypto from 'crypto';

const promptJobs = new Map<string, Workflow>();

interface QueuePromptOptions {
    clientId: string;
    prompt: string;
    workflow: Workflows;
    aspectRatio?: AspectRatio;
    keyPhrases?: string[];
    seed?: number;
}

export async function queuePrompt(options: QueuePromptOptions) {
    options.seed = options.seed || parseInt(crypto.randomBytes(4).toString('hex'), 16);
    const { clientId, prompt, aspectRatio, keyPhrases, seed } = options;
    let workflow: Workflow;
    switch (options.workflow) {
        case 'realistic':
            workflow = new RealisticWorkflow(clientId, prompt, { aspectRatio, keyPhrases, seed });
            break;
        case 'fantasy':
            workflow = new FantasyWorkflow(clientId, prompt, { aspectRatio, keyPhrases, seed });
            break;
        case 'anime':
            workflow = new AnimeWorkflow(clientId, prompt, { aspectRatio, keyPhrases, seed });
            break;
        default:
            workflow = new RealisticWorkflow(clientId, prompt, { aspectRatio, keyPhrases, seed });
            break;
    }
    void await workflow.startExecution();
    const promptId = workflow.promptId!;
    promptJobs.set(promptId, workflow);
    return promptId;
}

export function getPromptJob(jobId: string) {
    return promptJobs.get(jobId);
}
