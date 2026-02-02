import express, { type Request, type Response } from 'express';
import { body, param } from 'express-validator';
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

type ProductDetailsItem = ProductListItem & {
  likedUsers?: Types.ObjectId[];
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

productRoutes.get('/', async (req: Request, res: Response) => {
  const rawPage = Array.isArray(req.query.page) ? req.query.page[0] : req.query.page;
  const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;

  const parsedPage = typeof rawPage === 'string' ? Number.parseInt(rawPage, 10) : Number.NaN;
  const parsedLimit = typeof rawLimit === 'string' ? Number.parseInt(rawLimit, 10) : Number.NaN;

  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
  const limitBase = Number.isFinite(parsedLimit) && parsedLimit >= 1 ? parsedLimit : 9;
  const limit = Math.min(50, limitBase);

  const skip = (page - 1) * limit;

  const filter = {};
  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'categoryId', select: { name: 1 } })
      .lean()
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return res.json({
    products: (products as unknown as ProductListItem[]).map((p) => {
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
    }),
    page,
    limit,
    total,
    totalPages
  });
});

productRoutes.get(
  '/:id',
  [param('id').isMongoId().withMessage('id must be a valid Mongo id')],
  validateRequest,
  async (req: Request, res: Response) => {
    const product = (await Product.findById(req.params.id)
      .populate({ path: 'categoryId', select: { name: 1 } })
      .lean()) as unknown as ProductDetailsItem | null;

    if (!product) return res.status(404).json({ message: 'Product not found' });

    const categoryId = isPopulatedCategory(product.categoryId)
      ? product.categoryId._id.toString()
      : product.categoryId.toString();
    const categoryName = isPopulatedCategory(product.categoryId)
      ? product.categoryId.name ?? 'unknown'
      : 'unknown';

    const likedUsers = (product.likedUsers ?? []).map((x) => x.toString());

    return res.json({
      product: {
        id: product._id.toString(),
        sellerId: product.sellerId.toString(),
        title: product.title,
        description: product.description,
        price: product.price,
        category: { id: categoryId, name: categoryName },
        images: product.images ?? [],
        likedUsers,
        favoritesCount: likedUsers.length,
        publishedAt: new Date(product.publishedAt).toISOString()
      }
    });
  }
);

productRoutes.post(
  '/:id/favorite',
  authenticate,
  requireVerified,
  [param('id').isMongoId().withMessage('id must be a valid Mongo id')],
  validateRequest,
  async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const existing = await Product.findById(req.params.id).select({ sellerId: 1 }).lean();
    if (!existing) return res.status(404).json({ message: 'Product not found' });
    if (existing.sellerId.toString() === userId) {
      return res.status(403).json({ message: 'You cannot favorite your own product' });
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { likedUsers: userId } },
      { new: true }
    )
      .select({ likedUsers: 1 })
      .lean();

    if (!updated) return res.status(404).json({ message: 'Product not found' });

    const likedUsers = ((updated as unknown as { likedUsers?: Types.ObjectId[] }).likedUsers ?? []).map((x) =>
      x.toString()
    );

    return res.json({
      favorite: {
        isFavorited: true,
        favoritesCount: likedUsers.length,
        likedUsers
      }
    });
  }
);

productRoutes.delete(
  '/:id/favorite',
  authenticate,
  requireVerified,
  [param('id').isMongoId().withMessage('id must be a valid Mongo id')],
  validateRequest,
  async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const existing = await Product.findById(req.params.id).select({ sellerId: 1 }).lean();
    if (!existing) return res.status(404).json({ message: 'Product not found' });
    if (existing.sellerId.toString() === userId) {
      return res.status(403).json({ message: 'You cannot favorite your own product' });
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $pull: { likedUsers: userId } },
      { new: true }
    )
      .select({ likedUsers: 1 })
      .lean();

    if (!updated) return res.status(404).json({ message: 'Product not found' });

    const likedUsers = ((updated as unknown as { likedUsers?: Types.ObjectId[] }).likedUsers ?? []).map((x) =>
      x.toString()
    );

    return res.json({
      favorite: {
        isFavorited: false,
        favoritesCount: likedUsers.length,
        likedUsers
      }
    });
  }
);
