import express from 'express';
import { getAllPromptResults, getPromptResult, postPrompt } from '../controllers/prompts';

const router = express.Router();

router.post('/', postPrompt);
router.get('/results', getAllPromptResults);
router.get('/:id/result', getPromptResult);

export default router;