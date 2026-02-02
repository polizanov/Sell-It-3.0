import express, { type Request, type Response } from 'express';
import { body } from 'express-validator';
import type { Types } from 'mongoose';

import { authenticate } from '../middleware/authenticate';
import { requireVerified } from '../middleware/requireVerified';
import { validateRequest } from '../middleware/validateRequest';
import { Category } from '../models/Category';
import { Product } from '../models/Product';

export const productRoutes = express.Router();

type ProductImageInput = { url: string; publicId: string };

function normalizeCategoryName(raw: unknown) {
  if (typeof raw !== 'string') return null;
  const name = raw.trim().toLowerCase();
  if (!name) return null;
  return name;
}

type ProductListItem = {
  _id: Types.ObjectId;
  sellerId: Types.ObjectId;
  title: string;
  description: string;
  price: number;
  categoryId: Types.ObjectId | { _id: Types.ObjectId; name?: string };
  images?: Array<{ url: string; publicId: string }>;
  publishedAt: Date;
};

function isPopulatedCategory(
  x: ProductListItem['categoryId']
): x is { _id: Types.ObjectId; name?: string } {
  return typeof x === 'object' && x !== null && 'name' in x;
}

productRoutes.post(
  '/',
  authenticate,
  requireVerified,
  [
    body('title').isString().trim().notEmpty().withMessage('Title is required'),
    body('description').isString().trim().notEmpty().withMessage('Description is required'),
    body('price')
      .not()
      .isEmpty()
      .withMessage('Price is required')
      .bail()
      .isFloat({ gt: 0 })
      .withMessage('Price must be a positive number')
      .toFloat(),
    body().custom((value) => {
      const hasId = typeof value?.categoryId === 'string' && value.categoryId.trim().length > 0;
      const hasName = typeof value?.categoryName === 'string' && value.categoryName.trim().length > 0;
      if (hasId === hasName) {
        throw new Error('Provide exactly one of categoryId or categoryName');
      }
      return true;
    }),
    body('categoryId')
      .optional()
      .isMongoId()
      .withMessage('categoryId must be a valid Mongo id'),
    body('categoryName')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 64 })
      .withMessage('categoryName must be 1-64 characters'),
    body('images').optional().isArray({ max: 5 }).withMessage('Images must have at most 5 items'),
    body('images.*.url')
      .optional({ nullable: true })
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Image url is required'),
    body('images.*.publicId')
      .optional({ nullable: true })
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Image publicId is required')
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const sellerId = req.user!.id;

    const title = String(req.body.title).trim();
    const description = String(req.body.description).trim();
    const price = Number(req.body.price);

    const images =
      Array.isArray(req.body.images) && req.body.images.length > 0
        ? (req.body.images as Array<ProductImageInput>).slice(0, 5).map((img) => ({
            url: String(img.url).trim(),
            publicId: String(img.publicId).trim()
          }))
        : undefined;

    let categoryId: string;
    let categoryName: string;

    if (typeof req.body.categoryId === 'string' && req.body.categoryId.trim()) {
      const category = await Category.findById(req.body.categoryId).select({ _id: 1, name: 1 }).lean();
      if (!category) {
        return res.status(400).json({ message: 'Category not found' });
      }
      categoryId = category._id.toString();
      categoryName = category.name;
    } else {
      const normalizedName = normalizeCategoryName(req.body.categoryName);
      if (!normalizedName) {
        return res.status(400).json({ message: 'categoryName is required' });
      }

      const category = await Category.findOneAndUpdate(
        { name: normalizedName },
        { $setOnInsert: { name: normalizedName } },
        { new: true, upsert: true }
      )
        .select({ _id: 1, name: 1 })
        .lean();

      categoryId = category._id.toString();
      categoryName = category.name;
    }

    const created = await Product.create({
      sellerId,
      title,
      description,
      price,
      categoryId,
      images
    });

    return res.status(201).json({
      product: {
        id: created._id.toString(),
        sellerId: created.sellerId.toString(),
        title: created.title,
        description: created.description,
        price: created.price,
        category: { id: categoryId, name: categoryName },
        images: created.images ?? [],
        publishedAt: created.publishedAt.toISOString()
      }
    });
  }
);

productRoutes.get('/', async (_req: Request, res: Response) => {
  const products = (await Product.find({})
    .sort({ publishedAt: -1 })
    .populate({ path: 'categoryId', select: { name: 1 } })
    .lean()) as unknown as ProductListItem[];

  return res.json({
    products: products.map((p) => {
      const categoryId = isPopulatedCategory(p.categoryId)
        ? p.categoryId._id.toString()
        : p.categoryId.toString();
      const categoryName = isPopulatedCategory(p.categoryId) ? p.categoryId.name ?? 'unknown' : 'unknown';

      return {
        id: p._id.toString(),
        sellerId: p.sellerId.toString(),
        title: p.title,
        description: p.description,
        price: p.price,
        category: {
          id: categoryId,
          name: categoryName
        },
        images: p.images ?? [],
        publishedAt: new Date(p.publishedAt).toISOString()
      };
    })
  });
});

