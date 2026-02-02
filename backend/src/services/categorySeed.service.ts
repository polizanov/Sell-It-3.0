import { Category } from '../models/Category';

export const DEFAULT_CATEGORY_NAMES = ['clothes', 'shoes', 'phones', 'tablets', 'laptops'] as const;

export async function seedDefaultCategories() {
  // Idempotent upsert based on normalized (lowercased) name.
  await Promise.all(
    DEFAULT_CATEGORY_NAMES.map(async (name) => {
      await Category.updateOne(
        { name },
        {
          $setOnInsert: { name }
        },
        { upsert: true }
      );
    })
  );
}

