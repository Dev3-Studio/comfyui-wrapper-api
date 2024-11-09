import { z } from 'zod';
import { zTask, zTaskCreate, zTaskResult } from './zodSchemas';

export type Task = z.infer<typeof zTask>;
export type TaskCreate = z.infer<typeof zTaskCreate>;
export type TaskResult = z.infer<typeof zTaskResult>;