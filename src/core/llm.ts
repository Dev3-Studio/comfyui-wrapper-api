import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { getRequiredEnvVar } from '../utils/getRequiredEnvVar';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { JsonOutputParser, StringOutputParser } from '@langchain/core/output_parsers';
import { AspectRatio } from './workflows';

interface OptimisedPromptOptions {
    detailPrompt?: boolean;
}

interface OptimisedPrompt {
    prompt: string;
    detailedPrompt: string | null;
    workflow: 'realistic' | 'fantasy' | 'anime' | null;
    aspectRatio: AspectRatio | null;
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
			Define the aesthetic direction, such as illustration style, painting medium, digital art style, or photography. Experiment and blend styles such as line art, watercolor, oil painting, surrealism, expressionism, and product photography.
			If the image has a subject, the prompt should be written to amplify its presence first and any actions the subject takes afterward. Consider the images and prompts below.
			Describe the desired composition and framing of the image by specifying close-up shots or wide-angle views.
			Describe the lighting or shadows in the scene using terms like "backlight", "hard rim light", and "dynamic shadows"
			Specify technical parameters using cinematic terms to guide the desired perspective and framing. Terms like “bird’s eye view,” “close-up,” “crane shot,” and “wide-angle shot” can help direct the composition effectively. Consider using terms like “fish-eye lens” for a curved look to achieve unique visual effects.
			Everything should be described in a few sentences.
			Do not use paragraphs or bullet points.
			Do not include unnecessary words.
			Do not make up details that are not in the original prompt.
			Examples:
			${promptExamples.join('\n')}`,
        ),
        new HumanMessage(prompt),
    ];
    
    let detailedPrompt = prompt;
    if (options?.detailPrompt) {
        const result = await llm.invoke(messages);
        const parser = new StringOutputParser();
        detailedPrompt = await parser.invoke(result);
    }
    
    const template = ChatPromptTemplate.fromMessages([
        [
            'system',
            `You are a text-to-image pre-processor. Your job is to take a user prompt and convert it into a structured format. Always use your tool calling functionality.
            Choose the most appropriate workflow for the image based on the user's description. The workflow can be 'realistic', 'fantasy', 'anime', 'pixel', or 'abstract'.
            Choose the most appropriate aspect ratio for the image based on the user's description. The aspect ratio can be 'portrait', 'landscape', or 'square'.
            Extract key phrases from the user's description that represent what we want to see in the image. This includes styles, colors, objects, mood, setting, and other relevant details.
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
            .enum(['realistic', 'fantasy', 'anime'])
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
    
    const pipeResult = await pipeline.invoke({ input: detailedPrompt }).catch(() => null);
    const raw = pipeResult?.raw.content.toString();
    let parsed: z.infer<typeof parsingSchema> | undefined = pipeResult?.parsed;
    if (!parsed && raw) {
        // Structured output failed, attempt to re-parse raw content
        const parser = new JsonOutputParser<z.infer<typeof parsingSchema>>();
        const contentParseTemplate = ChatPromptTemplate.fromMessages([
            [
                'system',
                `You are a JSON parser.
                Respond only in valid JSON.
                The JSON object you return should match the following schema:
                {{
                    workflow: 'realistic' | 'fantasy' | 'anime';
                    aspectRatio: 'portrait' | 'landscape' | 'square';
                    keyPhrases: string[];
                }}
                `,
            ],
            ['user', '{input}'],
        ]);
        const contentParsePipeline = contentParseTemplate.pipe(llm).pipe(parser);
        const contentParsePipeResult = await contentParsePipeline.invoke({ input: raw }).catch(console.error);
        const parse = parsingSchema.safeParse(contentParsePipeResult);
        if (parse.success) {
            parsed = parse.data;
        }
    }
    
    if (!parsed) {
        return { prompt, detailedPrompt: null, workflow: null, aspectRatio: null, keyPhrases: null };
    } else {
        return {
            prompt,
            detailedPrompt,
            ...parsed,
        };
    }
}