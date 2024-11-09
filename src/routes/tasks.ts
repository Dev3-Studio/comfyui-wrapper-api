import express from 'express';
import { getTaskResult, getTaskStatus, postTask } from '../controllers/tasks';

const router = express.Router();

router.post('/', postTask);
router.get('/:id/status', getTaskStatus);
router.get('/:id/result', getTaskResult);

export default router;