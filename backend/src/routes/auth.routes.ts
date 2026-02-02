import express, { type Request, type Response } from 'express';
import { body, query } from 'express-validator';

import { authenticate } from '../middleware/authenticate';
import { validateRequest } from '../middleware/validateRequest';
import { User } from '../models/User';
import { sendVerificationEmail } from '../services/email.service';
import { signAccessToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateVerificationToken, hashVerificationToken } from '../utils/verificationToken';

export const authRoutes = express.Router();

type UserPublicShape = {
  email: string;
  username?: string | null;
  profileImageUrl?: string | null;
  isEmailVerified: boolean;
};

function toPublicUser(user: UserPublicShape) {
  return {
    email: user.email,
    username: user.username ?? null,
    profileImageUrl: user.profileImageUrl ?? null,
    isEmailVerified: user.isEmailVerified
  };
}

authRoutes.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isString()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('username')
      .optional()
      .isString()
      .isLength({ min: 3, max: 32 })
      .withMessage('Username must be 3-32 characters'),
    body('profileImageUrl')
      .optional()
      .isString()
      .isLength({ max: 2048 })
      .withMessage('Profile image URL is too long')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const email = String(req.body.email).toLowerCase().trim();
    const password = String(req.body.password);
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : null;
    const profileImageUrl =
      typeof req.body.profileImageUrl === 'string' ? req.body.profileImageUrl.trim() : null;

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const passwordHash = await hashPassword(password);
    const { token, tokenHash, expiresAt } = generateVerificationToken();

    const user = await User.create({
      email,
      username,
      profileImageUrl,
      passwordHash,
      isEmailVerified: false,
      emailVerificationTokenHash: tokenHash,
      emailVerificationTokenExpiresAt: expiresAt
    });

    // Best-effort email send: if it fails, user is created but unverified.
    try {
      await sendVerificationEmail(user.email, token);
    } catch (err) {
      console.error('Failed to send verification email:', err);
    }

    const accessToken = signAccessToken({ sub: user._id.toString() });
    return res.status(201).json({ token: accessToken, user: toPublicUser(user) });
  }
);

authRoutes.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isString().withMessage('Password is required')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const email = String(req.body.email).toLowerCase().trim();
    const password = String(req.body.password);

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

    const accessToken = signAccessToken({ sub: user._id.toString() });
    return res.json({ token: accessToken, user: toPublicUser(user) });
  }
);

authRoutes.get('/me', authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const user = await User.findById(userId);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  return res.json({ user: toPublicUser(user) });
});

authRoutes.get(
  '/verify-email',
  [query('token').isString().isLength({ min: 10 }).withMessage('Token is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    const token = String(req.query.token || '');
    const tokenHash = hashVerificationToken(token);

    // First, try to find user with matching token hash (regardless of expiration)
    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash
    });

    if (!user) {
      // Token hash not found - token is invalid or was already used and cleared
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    // User found with matching token hash
    if (user.isEmailVerified) {
      // User is already verified - return success (keep token hash for potential re-clicks)
      return res.json({ message: 'Email already verified', user: toPublicUser(user) });
    }

    // Check if token has expired
    if (!user.emailVerificationTokenExpiresAt || user.emailVerificationTokenExpiresAt <= new Date()) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    // Verify the user
    user.isEmailVerified = true;
    // Keep token hash so we can identify the user if they click the link again
    // It will be cleared when a new verification token is generated (e.g., via resend)
    await user.save();

    return res.json({ message: 'Email verified', user: toPublicUser(user) });
  }
);

authRoutes.post('/resend-verification', authenticate, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const user = await User.findById(userId);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  if (user.isEmailVerified) {
    return res.json({ message: 'Email already verified' });
  }

  const { token, tokenHash, expiresAt } = generateVerificationToken();
  user.emailVerificationTokenHash = tokenHash;
  user.emailVerificationTokenExpiresAt = expiresAt;
  await user.save();

  try {
    await sendVerificationEmail(user.email, token);
  } catch (err) {
    console.error('Failed to send verification email:', err);
    return res.status(500).json({ message: 'Failed to send verification email' });
  }

  return res.json({ message: 'Verification email sent' });
});

