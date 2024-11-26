import sdxlWorkflow from '../static/workflows/sdxl.json';
import WebSocket from 'ws';
import { getRequiredEnvVar } from '../utils/getRequiredEnvVar';
import { z } from 'zod';
import { getRandomSeed } from '../utils/getRandomSeed';

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
    readonly clientId: string;
    
    private httpUrl: URL;
    private wsUrl: URL;
    private ws: WebSocket;
    private _promptId?: string;
    private _progress?: Progress;
    
    protected workflowJson: object; // Workflow in API format
    
    constructor(clientId: string, workflowJson: object) {
        this.clientId = clientId;
        this.workflowJson = workflowJson;
        
        this.httpUrl = new URL(`http://${comfyUiHost}:${comfyUiPort}`);
        this.wsUrl = new URL(`ws://${comfyUiHost}:${comfyUiPort}/ws?clientId=${this.clientId}`);
        
        this.ws = new WebSocket(this.wsUrl.toString());
    }
    
    get promptId(): string | undefined {
        return this._promptId;
    }
    
    protected set promptId(value: string | undefined) {
        this._promptId = value;
    }
    
    get progress() {
        return this._progress;
    }
    
    protected set progress(value: Progress | undefined) {
        this._progress = value;
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
                prompt: this.workflowJson,
                client_id: this.clientId,
            }),
        });
        
        const data = await res.json() as { prompt_id: string };
        this.promptId = data.prompt_id;
    }
    
    protected setProgress(status: string, value: number, error?: string) {
        if (value < 0 || value > 1) {
            throw new Error('Progress value must be between 0 and 1');
        }
        console.log(`Progress: ${(value * 100).toFixed(2)}% - ${status}`);
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

export enum Checkpoint {
    JuggernautXL = 'juggernautxl',
    PonyXL = 'ponyxl',
    DreamshaperXL = 'dreamshaperxl'
}

export enum SamplerName {
    Dpmpp2m = 'dpmpp_2m',
    DpmppSde = 'dpmpp_sde',
    Euler = 'euler',
    EulerAncestral = 'euler_ancestral'
}

export enum Scheduler {
    Normal = 'normal',
    Karras = 'karras'
}

export enum AspectRatio {
    Portrait = 'portrait',
    Landscape = 'landscape',
    Square = 'square',
}

export enum Workflows {
    Anime = 'anime',
    Realistic = 'realistic',
    Fantasy = 'fantasy',
}

export class SDXLBasicWorkflow extends Workflow {
    private readonly INFERENCE_STEPS = 53;
    
    constructor(
        clientId: string,
        positivePrompt: string,
        negativePrompt: string,
        checkpoint: Checkpoint,
        seed: number,
        steps: number,
        cfg: number,
        samplerName: SamplerName,
        scheduler: Scheduler,
        aspectRatio?: AspectRatio,
    ) {
        sdxlWorkflow['CheckpointLoaderSimple'].inputs.ckpt_name = checkpoint + '.safetensors';
        
        const parseSeed = z.number().int().min(0).safeParse(seed);
        if (!parseSeed.success) throw new Error('Invalid seed');
        sdxlWorkflow['KSampler'].inputs.seed = parseSeed.data;
        
        const parseSteps = z.number().int().min(1).safeParse(steps);
        if (!parseSteps.success) throw new Error('Invalid steps');
        sdxlWorkflow['KSampler'].inputs.steps = parseSteps.data;
        
        const parseCfg = z.number().min(0.1).safeParse(cfg);
        if (!parseCfg.success) throw new Error('Invalid cfg');
        sdxlWorkflow['KSampler'].inputs.cfg = cfg;
        
        sdxlWorkflow['KSampler'].inputs.sampler_name = samplerName;
        sdxlWorkflow['KSampler'].inputs.scheduler = scheduler;
        
        sdxlWorkflow['CLIPTextEncodePositive'].inputs.text = positivePrompt;
        sdxlWorkflow['CLIPTextEncodeNegative'].inputs.text = negativePrompt;
        
        const MIN_RESOLUTION = 832;
        const MAX_RESOLUTION = 1216;
        const SQUARE_RESOLUTION = 1024;
        const DIMENSIONS = {
            'portrait': { width: MIN_RESOLUTION, height: MAX_RESOLUTION },
            'landscape': { width: MAX_RESOLUTION, height: MIN_RESOLUTION },
            'square': { width: SQUARE_RESOLUTION, height: SQUARE_RESOLUTION },
        };
        sdxlWorkflow['EmptyLatentImage'].inputs = {
            ...sdxlWorkflow['EmptyLatentImage'].inputs,
            ...DIMENSIONS[aspectRatio ?? AspectRatio.Square],
        };
        
        super(clientId, sdxlWorkflow);
    }
    
    protected override handleMessage(message: Message) {
        const data = message.data as { prompt_id: string };
        if (data.prompt_id !== this.promptId) return;
        switch (message.type) {
            case 'execution_start':
                this.setProgress('Starting', 0 / this.INFERENCE_STEPS);
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
                    this.setProgress('VAE decoding', 31 / this.INFERENCE_STEPS);
                    break;
                case 'SaveImage':
                    this.setProgress('Saving image', 52 / this.INFERENCE_STEPS);
                    break;
                default:
                    break;
            }
        }
        if (message.type === 'progress') {
            const { value, node } = message.data as { value: number, node: string };
            if (node === 'KSampler') this.setProgress('Running inference', value / this.INFERENCE_STEPS);
            if (node === 'FaceDetailer') this.setProgress('Running face detailer', (value + 31) / this.INFERENCE_STEPS);
        }
    }
}

export class AnimeWorkflow extends SDXLBasicWorkflow {
    constructor(clientId: string, prompt: string, options?: {
        seed?: number;
        aspectRatio?: AspectRatio,
        keyPhrases?: string[]
    }) {
        const keyPhrases = options?.keyPhrases ?? [];
        const positivePromptKeywords = ['score_9', 'score_8_up', 'score_7_up', 'source_anime'];
        const negativePromptKeywords = ['worst quality', 'bad quality', 'jpeg artifacts', 'source_cartoon', '3d', '(censor)', 'monochrome', 'blurry', 'lowres', 'watermark'];
        const positivePrompt = keyPhrases.length > 0 ? [...positivePromptKeywords, ...keyPhrases].join(', ') : positivePromptKeywords.join(', ') + ', ' + prompt;
        const negativePrompt = negativePromptKeywords.join(', ');
        super(
            clientId,
            positivePrompt,
            negativePrompt,
            Checkpoint.PonyXL,
            options?.seed ?? getRandomSeed(),
            30,
            7,
            SamplerName.Dpmpp2m,
            Scheduler.Karras,
            options?.aspectRatio,
        );
    }
}

export class RealisticWorkflow extends SDXLBasicWorkflow {
    constructor(clientId: string, prompt: string, options?: {
        seed?: number;
        aspectRatio?: AspectRatio,
        keyPhrases?: string[]
    }) {
        const keyPhrases = options?.keyPhrases ?? [];
        const positivePromptKeywords = ['High Resolution'];
        const negativePromptKeywords = ['fake eyes', 'bad hands', 'deformed eyes', 'bad eyes', 'cgi', '3D', 'digital', 'airbrushed'];
        const positivePrompt = keyPhrases.length > 0 ? [...positivePromptKeywords, ...keyPhrases].join(', ') : positivePromptKeywords.join(', ') + ', ' + prompt;
        const negativePrompt = negativePromptKeywords.join(', ');
        super(
            clientId,
            positivePrompt,
            negativePrompt,
            Checkpoint.JuggernautXL,
            options?.seed ?? getRandomSeed(),
            30,
            4.5,
            SamplerName.Dpmpp2m,
            Scheduler.Karras,
            options?.aspectRatio,
        );
    }
}

export class FantasyWorkflow extends SDXLBasicWorkflow {
    constructor(clientId: string, prompt: string, options?: {
        seed?: number;
        aspectRatio?: AspectRatio,
        keyPhrases?: string[]
    }) {
        super(
            clientId,
            options?.keyPhrases?.join(', ') ?? prompt,
            '',
            Checkpoint.DreamshaperXL,
            options?.seed ?? getRandomSeed(),
            8,
            2,
            SamplerName.DpmppSde,
            Scheduler.Karras,
            options?.aspectRatio,
        );
    }
}