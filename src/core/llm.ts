import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { getRequiredEnvVar } from '../utils/getRequiredEnvVar';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';

interface OptimisedPromptOptions {
    detailPrompt?: boolean;
}

interface OptimisedPrompt {
    prompt: string;
    detailedPrompt: string | null;
    workflow: 'realistic' | 'fantasy' | 'anime' | 'pixel' | 'abstract' | null;
    aspectRatio: 'portrait' | 'landscape' | 'square' | null;
    keyPhrases: string[] | null;
}

export async function optimisePrompt(prompt: string, options?: OptimisedPromptOptions) {
    const llm = new ChatOpenAI(
        {
            apiKey: getRequiredEnvVar('AKASHCHAT_KEY'),
            model: 'Meta-Llama-3-1-405B-Instruct-FP8',
        },
        { baseURL: 'https://chatapi.akash.network/api/v1' },
    );
    const promptExamples = [
        'Black and white coloring book page, simple rough 1960s cartoon black-and-white pen and ink line art, hand-drawn outline doodle of a smiling apple with a smiling worm sticking out of it on top of a stack of textbooks, overlay says Back to School! in a 1960s hand-written print.',
        'Stylistic, 3D render of a cute tiny robot sitting with a puppy on a couch, surrounded by colorful sticky notes.',
        'Expressionist painting of an astronaut walking on an alien planet with colorful balloons floating in the background. The scene is lit by soft lighting from the stars accentuating the presence of the astronaut in the vastness of space.',
        'Watercolor painting of a nostalgic 1950s diner, with neon signs glowing outside and people enjoying milkshakes at the counter.',
        'Simple illustration of a New York City office building in a modern comic book style. The colors should be rich and saturated with bright, energetic lighting and the background has interesting lines and textures.',
        'Anime rendering of a quiet, rural train station during a rain shower, with reflections on the wet pavement. Umbrellas dot the scene as the rain creates ripples in nearby puddles, and a train waits in the background.',
        'Wide view of a cute, isometric voxel cartoon 3D render of a vaporware apartment with a cat on a bed with starlight night view of the city from an open window in the background.',
    ];
    const messages = [
        new SystemMessage(
            `You are an image generation prompting AI. Your job is to take a user prompt
			and convert it into the following format. Be concise and descriptive, do not include unnecessary words in your description.
			The format is:
			Define the aesthetic direction, such as illustration style, painting medium, digital art style, or photography. Experiment and blend styles such as line art, watercolor, oil painting, surrealism, expressionism, and product photography
			If the image has a subject, the prompt should be written to amplify its presence first and any actions the subject takes afterward. Consider the images and prompts below.
			Describe the desired composition and framing of the image by specifying close-up shots or wide-angle views.
			Describe the lighting or shadows in the scene using terms like "backlight", "hard rim light", and "dynamic shadows"
			Specify technical parameters using cinematic terms to guide the desired perspective and framing. Terms like “bird’s eye view,” “close-up,” “crane shot,” and “wide-angle shot” can help direct the composition effectively. Consider using terms like “fish-eye lens” for a curved look to achieve unique visual effects.
			Everything should be described in a few sentences. Do not use paragraphs, and do not include unnecessary words.
			Examples:
			${promptExamples.join('\n')}`,
        ),
        new HumanMessage(prompt),
    ];
    
    let optimisedPrompt = prompt;
    if (options?.detailPrompt) {
        const result = await llm.invoke(messages);
        const parser = new StringOutputParser();
        optimisedPrompt = await parser.invoke(result);
    }
    
    const template = ChatPromptTemplate.fromMessages([
        [
            'system',
            `You are a text-to-image pre-processor. Your job is to take a user prompt and convert it into a structured format. Always use your tool calling functionality.
            Be concise and descriptive, do not include unnecessary words in your description. Examples:
            Prompt: "Stylistic, 3D render of a cute tiny robot sitting with a puppy on a couch, surrounded by colorful sticky notes. No people or cats."
            Output:
                - Workflow: 'realistic'
                - Aspect Ratio: 'portrait'
                - Positive Key Phrases: ['stylistic' , '3D render', 'cute tiny robot', 'sitting with a puppy on a couch', 'colorful sticky notes']
               
            Prompt: "Alien landscape with a pink sky and a green moon, featuring a futuristic city in the background. No humans or animals."
            Output:
                - Workflow: 'fantasy'
                - Aspect Ratio: 'landscape'
                - Positive Key Phrases: ['alien landscape', 'pink sky', 'green moon', 'futuristic city']`,
        ],
        ['user', '{input}'],
    ]);
    
    const parsingSchema = z.object({
        workflow: z
            .enum(['realistic', 'fantasy', 'anime', 'pixel', 'abstract'])
            .describe('The workflow to utilise when generating the image'),
        aspectRatio: z
            .enum(['portrait', 'landscape', 'square'])
            .describe('The aspect ratio of the image'),
        keyPhrases: z
            .string()
            .array()
            .describe('Positive phrases from the user input representing what we want to see in the image.'),
    });
    
    const structuredLlm = llm.withStructuredOutput(parsingSchema, {
        includeRaw: true,
        name: 'Text-to-Image Pre-Processor',
    });
    const pipeline = template.pipe(structuredLlm);
    
    const parsedOutput = await pipeline.invoke({ input: optimisedPrompt }).catch(() => null);
    if (parsedOutput && parsedOutput.parsed === null && parsedOutput.raw.content !== '') {
        // Structured output failed, attempt to re-parse raw content
        const rawContent = parsedOutput.raw.content.toString();
        const rawParse = await structuredLlm.invoke(rawContent).catch(() => null);
        if (rawParse) parsedOutput.parsed = rawParse.parsed;
    }
    
    if (!parsedOutput || !parsedOutput.parsed) {
        return { prompt: optimisedPrompt, detailedPrompt: null, workflow: null, aspectRatio: null, keyPhrases: null };
    } else {
        return {
            prompt,
            detailedPrompt: optimisedPrompt !== prompt ? optimisedPrompt : null,
            workflow: parsedOutput.parsed.workflow,
            aspectRatio: parsedOutput.parsed.aspectRatio,
            keyPhrases: parsedOutput.parsed.keyPhrases,
        };
    }
}

const text = 'A beautiful sunset over a calm lake with a small boat in the distance.';
optimisePrompt(text, { detailPrompt: true }).then(console.log);