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

const promptExamples = [
	'Black and white coloring book page, simple rough 1960s cartoon black-and-white pen and ink line art, hand-drawn outline doodle of a smiling apple with a smiling worm sticking out of it on top of a stack of textbooks, overlay says Back to School! in a 1960s hand-written print.',
	'Stylistic, 3D render of a cute tiny robot sitting with a puppy on a couch, surrounded by colorful sticky notes.',
	'Expressionist painting of an astronaut walking on an alien planet with colorful balloons floating in the background. The scene is lit by soft lighting from the stars accentuating the presence of the astronaut in the vastness of space.',
	'Watercolor painting of a nostalgic 1950s diner, with neon signs glowing outside and people enjoying milkshakes at the counter.',
	'Simple illustration of a New York City office building in a modern comic book style. The colors should be rich and saturated with bright, energetic lighting and the background has interesting lines and textures.',
	'Anime rendering of a quiet, rural train station during a rain shower, with reflections on the wet pavement. Umbrellas dot the scene as the rain creates ripples in nearby puddles, and a train waits in the background.',
	'Wide view of a cute, isometric voxel cartoon 3D render of a vaporware apartment with a cat on a bed with starlight night view of the city from an open window in the background.',
];

export async function optimisePrompt(prompt: string): Promise<string> {
	const chatCompletion = await llmClient.chat.completions.create({
		messages: [
			{ role: 'system', content: `You are an image generation prompting AI. Your job is to take a user prompt 
			and convert it into the following format. Be concise and descriptive, do not include unnecessary words in your description.
			The format is:
			Define the aesthetic direction, such as illustration style, painting medium, digital art style, or photography. Experiment and blend styles such as line art, watercolor, oil painting, surrealism, expressionism, and product photography
			If the image has a subject, the prompt should be written to amplify its presence first and any actions the subject takes afterward. Consider the images and prompts below.
			Describe the desired composition and framing of the image by specifying close-up shots or wide-angle views.
			Describe the lighting or shadows in the scene using terms like "backlight", "hard rim light", and "dynamic shadows"
			Specify technical parameters using cinematic terms to guide the desired perspective and framing. Terms like “bird’s eye view,” “close-up,” “crane shot,” and “wide-angle shot” can help direct the composition effectively. Consider using terms like “fish-eye lens” for a curved look to achieve unique visual effects.
			Text: The model can incorporate text into images. To achieve the best results, enclose the text in “double quotes” and keep the desired words or phrases short.
			Examples:
			${promptExamples.join('\n')}
			` },
			{ role: 'user', content: prompt },
		],
		model: 'Meta-Llama-3-1-405B-Instruct-FP8',
	});
	console.log(chatCompletion.choices[0].message.content);
	return chatCompletion.choices[0].message.content!;
}