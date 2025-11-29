import express, { Express, Request, Response } from 'express';

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Welcome to Veeragovindu', version: '1.0.0' });
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/api/echo', (req: Request, res: Response) => {
    res.json({ echo: req.body });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
