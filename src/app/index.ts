import express, { Request, Response } from 'express';
import prompts from '../routes/prompts';
import outputs from '../routes/outputs';

const app = express();

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('Hello World');
});

app.use('/prompts', prompts);
app.use('/outputs', outputs);

export default app;