import { AnimeWorkflow, AspectRatio, FantasyWorkflow, RealisticWorkflow, Workflow, Workflows } from '../core/workflows';
import { getRandomSeed } from '../utils/getRandomSeed';

const promptJobs = new Map<string, Workflow>();

interface QueuePromptJobOptions {
    clientId: string;
    text: string;
    workflow: Workflows;
    aspectRatio?: AspectRatio;
    seed?: number;
}

export async function queuePromptJob(options: QueuePromptJobOptions) {
    options.seed = options.seed || getRandomSeed();
    const { clientId, text, aspectRatio, seed } = options;
    let workflow: Workflow;
    switch (options.workflow) {
        case 'realistic':
            workflow = new RealisticWorkflow(clientId, text, { aspectRatio, seed });
            break;
        case 'fantasy':
            workflow = new FantasyWorkflow(clientId, text, { aspectRatio, seed });
            break;
        case 'anime':
            workflow = new AnimeWorkflow(clientId, text, { aspectRatio, seed });
            break;
        default:
            workflow = new RealisticWorkflow(clientId, text, { aspectRatio, seed });
            break;
    }
    void await workflow.startExecution();
    const promptId = workflow.promptId!;
    promptJobs.set(promptId, workflow);
    return workflow;
}

export function getPromptJob(jobId: string) {
    return promptJobs.get(jobId);
}
