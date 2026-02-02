import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 32
    },
    profileImageUrl: {
      type: String,
      default: null,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationTokenHash: {
      type: String,
      default: null
    },
    emailVerificationTokenExpiresAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

export type UserDoc = mongoose.InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User =
  (mongoose.models.User as mongoose.Model<UserDoc>) ||
  mongoose.model<UserDoc>('User', userSchema);

