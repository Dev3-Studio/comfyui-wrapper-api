import basicWorkflow from '../static/workflows/basic.json';
import * as crypto from 'node:crypto';

export function createBasicWorkflow(prompt: string, options?: {
    seed?: number,
    aspectRatio?: 'portrait' | 'landscape' | 'square'
}) {
    basicWorkflow['3'].inputs.seed = options?.seed ?? parseInt(crypto.randomBytes(2).toString('hex'), 16);
    basicWorkflow['6'].inputs.text = prompt;
    switch (options?.aspectRatio) {
        case 'portrait':
            basicWorkflow['5'].inputs.width = 832;
            basicWorkflow['5'].inputs.height = 1216;
            break;
        case 'landscape':
            basicWorkflow['5'].inputs.width = 1216;
            basicWorkflow['5'].inputs.height = 832;
            break;
        case 'square':
            basicWorkflow['5'].inputs.width = 1024;
            basicWorkflow['5'].inputs.height = 1024;
            break;
        default:
            basicWorkflow['5'].inputs.width = 1024;
            basicWorkflow['5'].inputs.height = 1024;
            break;
    }
    return basicWorkflow;
}