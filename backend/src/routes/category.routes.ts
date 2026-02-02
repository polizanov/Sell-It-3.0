import express from 'express';

import { Category } from '../models/Category';

export const categoryRoutes = express.Router();

categoryRoutes.get('/', async (_req, res) => {
  const categories = await Category.find({})
    .sort({ name: 1 })
    .select({ _id: 1, name: 1 })
    .lean();

  return res.json({
    categories: categories.map((c) => ({
      id: c._id.toString(),
      name: c.name
    }))
  });
});

