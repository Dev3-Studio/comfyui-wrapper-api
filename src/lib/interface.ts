import { z } from 'zod';
import { zTask, zTaskCreate, zTaskResult, zTaskStatus } from './zodSchemas';

export type Task = z.infer<typeof zTask>;
export type TaskCreate = z.infer<typeof zTaskCreate>;
export type TaskStatus = z.infer<typeof zTaskStatus>;
export type TaskResult = z.infer<typeof zTaskResult>;