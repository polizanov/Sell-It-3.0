import mongoose from 'mongoose';

export async function connectToDatabase(mongoUri: string) {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);
  return mongoose.connection;
}

export async function disconnectFromDatabase() {
  await mongoose.disconnect();
}

