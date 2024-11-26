import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { getRequiredEnvVar } from '../utils/getRequiredEnvVar';
import { AIMessage, type BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { AspectRatio, Workflows } from './workflows';
import { PromptCreate } from '../lib/zodSchemas';
import { getUuidV4 } from '../utils/getUuidV4';
import detailTextExamples from '../static/llm/detailText/examples.json';
import imagePreProcessExamples from '../static/llm/imagePreProcess/examples.json';
import fs from 'fs';
import path from 'path';

interface OptimisedPrompt {
    text: string;
    detailedText?: string;
    workflow?: Workflows;
    aspectRatio?: AspectRatio;
    seed?: number;
}

type ToolCallExample = {
    input: string;
    toolCallName: string;
    toolCallOutput: Record<string, any>;
};

/**
 * This function converts an example into a list of messages that can be fed into an LLM.
 *
 * This code serves as an adapter that transforms our example into a list of messages
 * that can be processed by a chat model.
 *
 * The list of messages for each example includes:
 *
 * 1) HumanMessage: This contains the content from which information should be extracted.
 * 2) AIMessage: This contains the information extracted by the model.
 *
 * Credit: https://js.langchain.com/docs/how_to/extraction_examples/
 */
function toolExampleToMessages(example: ToolCallExample): BaseMessage[] {
    return [
        new HumanMessage(example.input),
        new AIMessage({
            content: '',
            tool_calls: [{
                name: example.toolCallName,
                type: 'tool_call',
                id: getUuidV4(),
                args: example.toolCallOutput,
            }],
        }),
    ];
}

type LlmModel =
    'Meta-Llama-3-1-8B-Instruct-FP8'
    | 'Meta-Llama-3-1-405B-Instruct-FP8'
    | 'Meta-Llama-3-2-3B-Instruct'
    | 'nvidia-Llama-3-1-Nemotron-70B-Instruct-HF';

function getLlm(model?: LlmModel): ChatOpenAI {
    return new ChatOpenAI(
        {
            apiKey: getRequiredEnvVar('AKASHCHAT_KEY'),
            model: model || 'Meta-Llama-3-1-8B-Instruct-FP8',
        },
        { baseURL: 'https://chatapi.akash.network/api/v1' },
    );
}

async function detailPromptText(text: string): Promise<string> {
    const llm = getLlm('Meta-Llama-3-1-405B-Instruct-FP8');
    const systemPrompt = fs.readFileSync(path.join(__dirname, '../static/llm/detailText/system.txt')).toString();
    const messages = [
        new SystemMessage(systemPrompt),
        ...detailTextExamples.flatMap(({ input, output }) => [
            new HumanMessage(input),
            new AIMessage(output),
        ]),
        new HumanMessage(text),
    ];
    const result = await llm.invoke(messages);
    const parser = new StringOutputParser();
    return await parser.invoke(result);
}

async function inferSettingsFromPromptText(text: string): Promise<{ workflow: Workflows, aspectRatio: AspectRatio }> {
    const systemPrompt = fs.readFileSync(path.join(__dirname, '../static/llm/imagePreProcess/system.txt')).toString();
    const chatPromptTemplate = ChatPromptTemplate.fromMessages([
        ['system', systemPrompt],
        new MessagesPlaceholder('examples'),
        ['user', '{input}'],
    ]);
    
    const examples = imagePreProcessExamples.flatMap(toolExampleToMessages);
    
    const settingsSchema = z.object({
        workflow: z.nativeEnum(Workflows).describe('The workflow to utilise when generating the image'),
        aspectRatio: z.nativeEnum(AspectRatio).describe('The aspect ratio of the image'),
    });
    
    const llm = getLlm();
    const structuredLlm = llm.withStructuredOutput(settingsSchema, { name: 'imagePreProcessor' });
    
    const pipeline = chatPromptTemplate.pipe(structuredLlm);
    return await pipeline.invoke({ input: text, examples });
}

export async function optimisePrompt(prompt: PromptCreate): Promise<OptimisedPrompt> {
    const detailedText = prompt.detailText ? await detailPromptText(prompt.text).catch(() => prompt.text) : undefined;
    
    const settings = await inferSettingsFromPromptText(detailedText || prompt.text).catch(() => undefined);
    
    return {
        text: prompt.text,
        detailedText,
        workflow: settings?.workflow,
        aspectRatio: settings?.aspectRatio,
        seed: prompt.seedOverride,
    };
}