import type { RequestHandler } from 'express';

import { verifyAccessToken } from '../utils/jwt';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string };
  }
}

export const authenticate: RequestHandler = (req, res, next) => {
  const header = req.header('authorization');
  if (!header) return res.status(401).json({ message: 'Missing Authorization header' });

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Invalid Authorization header' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

