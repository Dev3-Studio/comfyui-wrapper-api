import { AnimeWorkflow, FantasyWorkflow, Layout, RealisticWorkflow, Workflow, Workflows } from '../core/workflows';
import { getRandomSeed } from '../utils/getRandomSeed';

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
    promptJobs.set(promptId, workflow);
    return workflow;
}

export function getPromptJob(jobId: string) {
    return promptJobs.get(jobId);
}
