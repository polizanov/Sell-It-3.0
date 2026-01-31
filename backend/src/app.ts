import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { body } from 'express-validator';

import { validateRequest } from './middleware/validateRequest';

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

  // Example validated endpoint (placeholder for future auth module)
  app.post(
    '/api/auth/register',
    [
      body('email').isEmail().withMessage('Valid email is required'),
      body('password')
        .isString()
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
    ],
    validateRequest,
    (req: express.Request, res: express.Response) => {
      res.status(201).json({
        message: 'Registered (stub)',
        email: req.body.email
      });
    }
  );

  return app;
}

export const app = createApp();

