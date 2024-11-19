import { Task, TaskStatus } from '../lib/interface';
import { getJob, queuePrompt } from '../jobs';
import { TaskCreate } from '../lib/zodSchemas';
import { llmClient } from '../init/akashChat';

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
    console.log('test');
    if (options.optimisePrompt) prompt = await optimisePrompt(prompt);
    
    // todo add other options
    
    
    const taskId = await queuePrompt(prompt);
    return {
        id: taskId,
        prompt: task.prompt,
    };
    
}

export async function getTaskStatus(id: string): Promise<TaskStatus> {
    const task = getJob(id);
    if (!task) {
        throw new Error('NOT_FOUND');
    }
    const promptId = task.getPromptId();
    const progress = task.getProgress();
    
    if (!promptId || !progress) {
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
    const progress = task.getProgress();
    if (progress && progress.value !== 1) {
        throw new Error('NOT_COMPLETED');
    }
    
    return await task.getResult();
}

export async function optimisePrompt(prompt: string): Promise<string> {
    const chatCompletion = await llmClient.chat.completions.create({
        messages: [{ role: 'user', content: 'Say this is a test' }],
        model: 'Meta-Llama-3-1-405B-Instruct-FP8',
    });
    console.log(chatCompletion.choices[0].message.content);
    // todo optimise prompt
    return prompt;
}