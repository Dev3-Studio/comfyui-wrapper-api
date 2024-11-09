import { Task, TaskResult } from '../lib/interface';

export async function createTask(prompt: string): Promise<Task> {
    // TODO: implement
    return {
        id: '123',
        prompt,
    };
}

export async function getTaskStatus(id: string): Promise<TaskResult> {
    // TODO: implement
    return {
        id,
        prompt: 'placeholder',
        result: Buffer.from('placeholder'),
    };
}