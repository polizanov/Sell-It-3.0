import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { authRoutes } from './routes/auth.routes';
import { categoryRoutes } from './routes/category.routes';
import { productRoutes } from './routes/product.routes';
import { testUtilsRoutes } from './routes/testUtils.routes';

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
  app.use('/api/categories', categoryRoutes);
  app.use('/api/products', productRoutes);

  if (process.env.ENABLE_TEST_UTILS === 'true') {
    app.use('/api/test-utils', testUtilsRoutes);
  }

  return app;
}

export const app = createApp();

