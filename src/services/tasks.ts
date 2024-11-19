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
		prompt,
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
		messages: [
			{ role: 'system', content: `You are an image generation prompting AI. Your job is to take a user prompt 
			and convert it into the following format. Do not include any of the titles just rearrange the prompt to be 
			in this format and add any required detail. The format is:
			Describe the primary focus of the image, including the main subject and key actions or features.
			Specify the desired artistic style or the medium in which the image should be rendered.
			Describe the setting or background.
			Convey the emotional tone or atmosphere.
			Suggest dominant colors or overall color scheme.
			End with relevant, comma separated tags for additional context or specifics not covered in the description.
			Do not include the # character in your tags.
			` },
			{ role: 'user', content: prompt },
		],
		model: 'Meta-Llama-3-1-405B-Instruct-FP8',
	});
	console.log(chatCompletion.choices[0].message.content);
	return chatCompletion.choices[0].message.content!;
}