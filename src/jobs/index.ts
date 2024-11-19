import crypto from 'crypto';
import { BasicWorkflow, Workflow } from '../core/workflows';

const clientId = crypto.randomUUID();
const jobs = new Map<string, Workflow>();

export async function queuePrompt(prompt: string): Promise<string> {
    const workflow = new BasicWorkflow(clientId, prompt);
    void await workflow.startExecution();
    const promptId = workflow.getPromptId()!;
    jobs.set(promptId, workflow);
    return promptId;
}

export function getJob(promptId: string) {
    return jobs.get(promptId);
}
