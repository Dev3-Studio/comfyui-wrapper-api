import { Task, TaskStatus } from '../lib/interface';
import { getJob, queuePrompt } from '../jobs';
import { TaskCreate } from '../lib/zodSchemas';
import { optimisePrompt as _optimisePrompt } from '../core/llm';

export async function createTask(task: TaskCreate): Promise<Task> {
    if (!task.options) {
        const taskId = await queuePrompt(task.prompt);
        return {
            id: taskId,
            prompt: task.prompt,
        };
    }
    const options = task.options;
    let prompt = task.prompt;
    
    if (options.optimisePrompt) prompt = await optimisePrompt(prompt);
    
    // todo add other options
    
    
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
    const task = getJob(id);
    if (!task) {
        throw new Error('NOT_FOUND');
    }
    const progress = task.progress;
    if (progress && progress.value !== 1) {
        throw new Error('NOT_COMPLETED');
    }
    
    return await task.getResult();
}