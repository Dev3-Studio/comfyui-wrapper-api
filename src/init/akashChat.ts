import OpenAI from 'openai';
import { getRequiredEnvVar } from '../utils/getRequiredEnvVar';

export const llmClient = new OpenAI({
	apiKey: getRequiredEnvVar('AKASHCHAT_KEY'),
	baseURL: 'https://chatapi.akash.network/api/v1',
});