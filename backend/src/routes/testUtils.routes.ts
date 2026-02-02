import express from 'express';

import { Product } from '../models/Product';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { DEFAULT_CATEGORY_NAMES, seedDefaultCategories } from '../services/categorySeed.service';
import { signAccessToken } from '../utils/jwt';
import { hashPassword } from '../utils/password';

export const testUtilsRoutes = express.Router();

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

testUtilsRoutes.post('/create-verified-user', async (_req, res) => {
  const uniq = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const email = `e2e_${uniq}@sellit.local`;
  const username = `e2e_${uniq}`.slice(0, 32);

  const passwordHash = await hashPassword('password123');

  const user = await User.create({
    email,
    username,
    profileImageUrl: null,
    passwordHash,
    isEmailVerified: true,
    emailVerificationTokenHash: null,
    emailVerificationTokenExpiresAt: null
  });

  const token = signAccessToken({ sub: user._id.toString() });
  return res.status(201).json({ token, user: toPublicUser(user) });
});

testUtilsRoutes.post('/reset', async (_req, res) => {
  await Product.deleteMany({});
  await Category.deleteMany({ name: { $nin: [...DEFAULT_CATEGORY_NAMES] } });
  await seedDefaultCategories();

  return res.json({ ok: true });
});

