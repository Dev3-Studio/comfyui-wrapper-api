import express, { Request, Response } from 'express';
import tasks from '../routes/tasks';

const app = express();

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('Hello World');
});

app.use('/tasks', tasks);

export default app;