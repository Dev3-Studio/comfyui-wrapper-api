import basicWorkflow from '../static/workflows/basic.json';
import * as crypto from 'node:crypto';
import WebSocket from 'ws';
import { getRequiredEnvVar } from '../utils/getRequiredEnvVar';

const comfyUiHost = getRequiredEnvVar('COMFY_UI_HOST');
const comfyUiPort = getRequiredEnvVar('COMFY_UI_PORT');

interface Progress {
    value: number; // 0-1
    status: string;
    error?: string;
}

interface Message {
    type: string;
    data: object;
}

export class Workflow {
    private readonly clientId: string;
    private readonly json: any; // Workflow in API format
    
    private httpUrl: URL;
    private wsUrl: URL;
    private ws: WebSocket;
    
    private progress?: Progress;
    
    protected promptId?: string;
    
    constructor(clientId: string, json: any) {
        this.clientId = clientId;
        this.json = json;
        
        this.httpUrl = new URL(`http://${comfyUiHost}:${comfyUiPort}`);
        this.wsUrl = new URL(`ws://${comfyUiHost}:${comfyUiPort}/ws?clientId=${this.clientId}`);
        
        this.ws = new WebSocket(this.wsUrl.toString());
    }
    
    async startExecution(): Promise<void> {
        this.ws.on('message', this.handleWebSocketData);
        
        this.ws.on('error', () => {
            this.ws.close();
            this.setProgress('Failed', 0, 'Connection terminated');
        });
        
        const res = await fetch(this.httpUrl.toString() + 'prompt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: this.json,
                client_id: this.clientId,
            }),
        });
        
        const data = await res.json() as { prompt_id: string };
        this.promptId = data.prompt_id;
    }
    
    getPromptId() {
        return this.promptId;
    }
    
    getProgress() {
        return this.progress;
    }
    
    async getResult(): Promise<Buffer> {
        if (this.progress?.value !== 1) {
            throw new Error('Workflow is not completed');
        }
        if (!this.promptId) {
            throw new Error('Prompt ID is not set');
        }
        const res = await fetch(this.httpUrl.toString() + `history/${this.promptId}`);
        const json = await res.json() as {
            [promptId: string]: { outputs: { SaveImage: { images: Array<Record<string, string>> } } }
        };
        
        const imageData = json[this.promptId].outputs.SaveImage.images[0];
        
        const imageRes = await fetch(this.httpUrl.toString() + 'view?' + new URLSearchParams(imageData));
        return Buffer.from(await imageRes.arrayBuffer());
    }
    
    protected setProgress(status: string, value: number, error?: string) {
        if (value < 0 || value > 1) {
            throw new Error('Progress value must be between 0 and 1');
        }
        this.progress = { status, value, error };
    }
    
    protected handleMessage(message: Message) {
        const data = message.data as { prompt_id: string };
        if (data.prompt_id !== this.promptId) return;
        switch (message.type) {
            case 'execution_start':
                this.setProgress('Starting', 0);
                break;
            case 'execution_success':
                this.setProgress('Completed', 1);
                break;
        }
    }
    
    private handleWebSocketData = (data: unknown) => {
        if (!(data instanceof Buffer)) return;
        
        const message = JSON.parse(data.toString()) as Message;
        this.handleMessage(message);
        if (this.progress?.value === 1) {
            this.ws.close();
        }
    };
}

export class BasicWorkflow extends Workflow {
    private TOTAL_STEPS = 11;
    
    constructor(clientId: string, prompt: string, options?: {
        seed?: number,
        aspectRatio?: 'portrait' | 'landscape' | 'square'
    }) {
        basicWorkflow['KSampler'].inputs.seed = options?.seed ?? parseInt(crypto.randomBytes(2).toString('hex'), 16);
        basicWorkflow['CLIPTextEncodePositive'].inputs.text = prompt;
        const dimensions = {
            'portrait': { width: 832, height: 1216 },
            'landscape': { width: 1216, height: 832 },
            'square': { width: 1024, height: 1024 },
        };
        basicWorkflow['EmptyLatentImage'].inputs = {
            ...basicWorkflow['EmptyLatentImage'].inputs,
            ...dimensions[options?.aspectRatio ?? 'square'],
        };
        const json = basicWorkflow;
        super(clientId, json);
    }
    
    protected override handleMessage(message: Message) {
        const data = message.data as { prompt_id: string };
        if (data.prompt_id !== this.promptId) return;
        switch (message.type) {
            case 'execution_start':
                this.setProgress('Starting', 0);
                break;
            case 'execution_success':
                this.setProgress('Completed', 1);
                break;
            default:
                break;
        }
        if (message.type === 'executing') {
            const { node } = message.data as { node: string };
            switch (node) {
                case 'VAEDecode':
                    this.setProgress('VAE decoding', 9 / this.TOTAL_STEPS);
                    break;
                case 'SaveImage':
                    this.setProgress('Saving image', 10 / this.TOTAL_STEPS);
                    break;
                default:
                    break;
            }
        }
        if (message.type === 'progress') {
            const { value } = message.data as { value: number };
            this.setProgress('Running inference', value / this.TOTAL_STEPS);
        }
    }
}