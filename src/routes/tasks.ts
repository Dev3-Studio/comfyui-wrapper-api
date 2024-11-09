import express from 'express';
import { getTaskStatus, postTask } from '../controllers/tasks';

const router = express.Router();

router.post('/', postTask);
router.get('/:id/status', getTaskStatus);

export default router;