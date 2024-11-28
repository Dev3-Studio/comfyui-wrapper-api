import express from 'express';
import { getOutput } from '../controllers/outputs';

const router = express.Router();

router.post('/:filename', getOutput);

export default router;