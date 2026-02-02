import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 1,
      maxlength: 64
    }
  },
  // Plan requires no timestamps / no extra fields.
  { timestamps: false }
);

// Enforce uniqueness on normalized (lowercased) name.
categorySchema.index({ name: 1 }, { unique: true });

export type CategoryDoc = mongoose.InferSchemaType<typeof categorySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Category =
  (mongoose.models.Category as mongoose.Model<CategoryDoc>) ||
  mongoose.model<CategoryDoc>('Category', categorySchema);

