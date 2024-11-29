import express from 'express';
import { getOutput } from '../controllers/outputs';

const router = express.Router();

router.get('/:filename', getOutput);

export default router;