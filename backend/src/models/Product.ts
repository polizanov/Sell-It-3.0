import mongoose from 'mongoose';

const productImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    publicId: { type: String, required: true, trim: true, maxlength: 256 }
  },
  { _id: false, timestamps: false }
);

const productSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 160
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 5000
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    images: {
      type: [productImageSchema],
      default: undefined,
      validate: {
        validator: (arr: Array<unknown> | undefined) => !arr || arr.length <= 5,
        message: 'Images must have at most 5 items'
      }
    },
    publishedAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  { timestamps: false }
);

productSchema.index({ publishedAt: -1 });

export type ProductDoc = mongoose.InferSchemaType<typeof productSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Product =
  (mongoose.models.Product as mongoose.Model<ProductDoc>) ||
  mongoose.model<ProductDoc>('Product', productSchema);

