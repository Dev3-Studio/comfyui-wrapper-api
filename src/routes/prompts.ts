import express from 'express';
import { getPromptResult, getPromptStatus, postPrompt } from '../controllers/prompts';

const router = express.Router();

router.post('/', postPrompt);
router.get('/:id/status', getPromptStatus);
router.get('/:id/result', getPromptResult);

export default router;