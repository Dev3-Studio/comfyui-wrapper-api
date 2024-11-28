import express from 'express';
import { getPromptResult, postPrompt } from '../controllers/prompts';

const router = express.Router();

router.post('/', postPrompt);
router.get('/:id/result', getPromptResult);

export default router;