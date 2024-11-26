import { AnimeWorkflow, FantasyWorkflow, Layout, RealisticWorkflow, Workflow, Workflows } from '../core/workflows';
import { getRandomSeed } from '../utils/getRandomSeed';

const promptJobs = new Map<string, Workflow>();

interface QueuePromptJobOptions {
    clientId: string;
    text: string;
    workflow: Workflows;
    layout?: Layout;
    seed?: number;
}

export async function queuePromptJob(options: QueuePromptJobOptions) {
    options.seed = options.seed || getRandomSeed();
    const { clientId, text, layout, seed } = options;
    let workflow: Workflow;
    switch (options.workflow) {
        case 'realistic':
            workflow = new RealisticWorkflow(clientId, text, { layout, seed });
            break;
        case 'fantasy':
            workflow = new FantasyWorkflow(clientId, text, { layout, seed });
            break;
        case 'anime':
            workflow = new AnimeWorkflow(clientId, text, { layout, seed });
            break;
        default:
            workflow = new RealisticWorkflow(clientId, text, { layout, seed });
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
