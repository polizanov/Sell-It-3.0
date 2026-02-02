import type { RequestHandler } from 'express';

import { User } from '../models/User';

export const requireVerified: RequestHandler = async (req, res, next) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const user = await User.findById(userId).lean();
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  if (!user.isEmailVerified) {
    return res.status(403).json({ message: 'Email verification required' });
  }

  return next();
};

