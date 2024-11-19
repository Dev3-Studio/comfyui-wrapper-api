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
		messages: [
			{ role: 'system', content: `You are an image generation prompting AI. Your job is to take a user prompt 
			and convert it into the following format. Do not include any of the titles just rearrange the prompt to be 
			in this format and add any required detail. The format is:
			Main Description: Describe the primary focus of the image, including the main subject and key actions or features.
			Artistic Style: Specify the desired artistic style or the medium in which the image should be rendered.
			Environment: Describe the setting or background.
			Mood and Atmosphere: Convey the emotional tone or atmosphere.
			Color Palette: Suggest dominant colors or overall color scheme.
			Tags: End with relevant tags for additional context or specifics not covered in the description.
			` },
			{ role: 'user', content: prompt },
		],
		model: 'Meta-Llama-3-1-405B-Instruct-FP8',
	});
	console.log(chatCompletion.choices[0].message.content);
	return chatCompletion.choices[0].message.content!;
}