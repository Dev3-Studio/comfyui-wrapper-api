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
	return {
		id: task.promptId,
		status: task.status,
		progress: task.progress,
		statusMessage: task.statusMessage,
	};
}

export async function getTaskResult(id: string): Promise<Buffer> {
	const task = getJob(id);
	if (!task) {
		throw new Error('NOT_FOUND');
	}
	if (task.status !== 'completed') {
		throw new Error('NOT_COMPLETED');
	}

	return task.output!;
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