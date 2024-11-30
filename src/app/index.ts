import express, { Request, Response } from 'express';
import prompts from '../routes/prompts';
import outputs from '../routes/outputs';
import cors from 'cors';

const app = express();

app.use(express.json());

app.use(cors());

app.get('/', (req: Request, res: Response) => {
    res.send('Hello World');
});

app.use('/prompts', prompts);
app.use('/outputs', outputs);

export default app;