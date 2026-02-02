import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { authRoutes } from './routes/auth.routes';

export function createApp() {
  const app = express();

  const corsOrigin = process.env.CORS_ORIGIN || '*';

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true
    })
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', name: 'SellIt API' });
  });
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', name: 'SellIt API' });
  });

  app.use('/api/auth', authRoutes);

  return app;
}

export const app = createApp();

