import { getRequiredEnvVar } from '../utils/getRequiredEnvVar';
import { createBasicWorkflow } from '../core/workflows';
import WebSocket from 'ws';
import crypto from 'crypto';
import { URLSearchParams } from 'node:url';

interface Job {
    promptId: string,
    prompt: string,
    type: 'basic' | 'pro',
    progress: number,
    status: 'pending' | 'completed',
    statusMessage: string,
    output?: Buffer,
    lastUpdated: Date,
}

enum WebSocketMessageType {
    status = 'status',
    execution_start = 'execution_start',
    execution_cached = 'execution_cached',
    executing = 'executing',
    progress = 'progress',
    execution_success = 'execution_success',
}

interface StatusWebSocketMessage {
    type: WebSocketMessageType.status,
    data: {
        status: {
            exec_info: {
                queue_remaining: number,
            },
        },
        sid?: string,
    };
}

interface ExecutionStartWebSocketMessage {
    type: WebSocketMessageType.execution_start,
    data: {
        prompt_id: string,
        timestamp: number,
    };
}

interface ExecutionCachedWebSocketMessage {
    type: WebSocketMessageType.execution_cached,
    data: {
        nodes: string[],
        prompt_id: string,
        timestamp: number,
    };
}

interface ExecutingWebSocketMessage {
    type: WebSocketMessageType.executing,
    data: {
        node: string | null,
        display_node?: string,
        prompt_id: string,
    };
}

interface ProgressWebSocketMessage {
    type: WebSocketMessageType.progress,
    data: {
        value: number,
        max: number,
        prompt_id: string,
        node: string,
    };
}

interface ExecutionSuccessWebSocketMessage {
    type: WebSocketMessageType.execution_success,
    data: {
        prompt_id: string,
        timestamp: number,
    };
}

type WebSocketMessage =
    StatusWebSocketMessage
    | ExecutionStartWebSocketMessage
    | ExecutionCachedWebSocketMessage
    | ExecutingWebSocketMessage
    | ProgressWebSocketMessage
    | ExecutionSuccessWebSocketMessage;

const comfyUiHost = getRequiredEnvVar('COMFY_UI_HOST');
const comfyUiPort = getRequiredEnvVar('COMFY_UI_PORT');
const clientId = crypto.randomUUID();
const jobs = new Map<string, Job>();
const ws = new WebSocket(`ws://${comfyUiHost}:${comfyUiPort}/ws?clientId=${clientId}`);
const httpUrl = new URL(`http://${comfyUiHost}:${comfyUiPort}`);

ws.on('open', () => {
    console.log('Connected to Comfy UI websocket with client ID:', clientId);
});

ws.on('message', async (data: unknown) => {
    if (!(data instanceof Buffer)) return;

    const BASIC_JOB_MAX_PROGRESS = 14;

    const message = JSON.parse(data.toString()) as WebSocketMessage;
    if (message.type === WebSocketMessageType.executing) {
        const job = jobs.get(message.data.prompt_id);
        if (job && job.type === 'basic') {
            job.status = 'pending';
            job.lastUpdated = new Date();
            let progress = 0;
            let statusMessage;
            switch (message.data.node) {
                case '5':
                    progress = 1 / BASIC_JOB_MAX_PROGRESS; // Step 1 of 14
                    statusMessage = 'Setting resolution';
                    break;
                case '6':
                    progress = 2 / BASIC_JOB_MAX_PROGRESS; // Step 2 of 14
                    statusMessage = 'Tokenizing prompt';
                    break;
                case '3':
                    progress = 3 / BASIC_JOB_MAX_PROGRESS; // Step 3 of 14
                    statusMessage = 'Running inference';
                    break;
                case '8':
                    progress = 12 / BASIC_JOB_MAX_PROGRESS; // Step 12 of 14
                    statusMessage = 'Running VAE decode';
                    break;
                case '9':
                    progress = 13 / BASIC_JOB_MAX_PROGRESS; // Step 13 of 14
                    statusMessage = 'Saving image';
                    break;
                default:
                    statusMessage = 'Executing';
                    break;
            }
            if (message.data.node === null) {
                progress = 14 / BASIC_JOB_MAX_PROGRESS; // Step 14 of 14
                statusMessage = 'Completed';
                const jobHistoryResponse = await fetch(httpUrl.toString() + 'history');
                const jobResultJson = await jobHistoryResponse.json() as Record<string, {
                    outputs: { '9': { images: [{ filename: string, subfolder: string, type: 'output' }] } }
                }>;
                // console.dir(jobResultJson, { depth: null });
                const jobOutputData = jobResultJson[job.promptId]['outputs']['9']['images'][0];
                const jobOutputResponse = await fetch(httpUrl.toString() + 'view?' + new URLSearchParams(jobOutputData));
                job.output = Buffer.from(await jobOutputResponse.arrayBuffer());
            }
            job.progress = progress;
            if (progress === 1) job.status = 'completed';
            job.statusMessage = statusMessage;
        }
    }
    if (message.type === WebSocketMessageType.progress) {
        const job = jobs.get(message.data.prompt_id);
        if (job && job.type === 'basic') {
            job.lastUpdated = new Date();
            job.progress = (3 + message.data.value) / BASIC_JOB_MAX_PROGRESS; // Step 4-11 of 14
            job.statusMessage = `Running inference`;
        }
    }
});

ws.on('error', (error) => {
    ws.close();
    console.error('WebSocket error:', error);
    throw error;
});

export async function queuePrompt(prompt: string): Promise<string> {
    const workflow = createBasicWorkflow(prompt);
    const queueResult = await fetch(httpUrl.toString() + 'prompt', {
        method: 'POST',
        body: JSON.stringify({
            prompt: workflow,
            client_id: clientId,
        }),
    });
    const queueData = await queueResult.json() as { prompt_id: string };

    jobs.set(queueData.prompt_id, {
        promptId: queueData.prompt_id,
        prompt,
        type: 'basic',
        progress: 0,
        status: 'pending',
        statusMessage: 'Waiting in queue',
        lastUpdated: new Date(),
    });

    return queueData.prompt_id;
}

export function getJob(promptId: string) {
    return jobs.get(promptId);
}
