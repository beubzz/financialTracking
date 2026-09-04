import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import authRouter from './routes/auth.js';

const app = express();
app.use(cors({ origin: env.FRONTEND_URL }));
app.use(express.json());
app.use('/api/v1/auth', authRouter);

app.get('/health', (_request, response) => {
  response.json({ status: 'ok', service: 'financial-tracking-api' });
});

app.use((_request, response) => {
  response.status(404).json({ error: 'Route not found' });
});

app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT}`);
});
