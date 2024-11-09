import { Task, TaskStatus } from '../lib/interface';

export async function createTask(prompt: string): Promise<Task> {
    // TODO: implement
    return {
        id: '123',
        prompt,
    };
}

export async function getTaskStatus(id: string): Promise<TaskStatus> {
    // TODO: implement
    return {
        id,
        status: 'pending',
        progress: 0.5,
    };
}