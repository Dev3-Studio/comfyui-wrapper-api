import { Task, TaskStatus } from '../lib/interface';
import { getJob, queuePrompt } from '../jobs';

export async function createTask(prompt: string): Promise<Task> {
    const taskId = await queuePrompt(prompt);
    return {
        id: taskId,
        prompt,
    };
}

export async function getTaskStatus(id: string): Promise<TaskStatus> {
    const task = getJob(id);
    if (!task) {
        throw new Error('NOT_FOUND');
    }
    return {
        id: task.promptId,
        status: task.status,
        progress: task.progress,
        statusMessage: task.statusMessage,
    };
}