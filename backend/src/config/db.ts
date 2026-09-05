import mongoose from 'mongoose';
import { env } from './env';

mongoose.connection.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error(`MongoDB connection error: ${err}`);
  process.exit(1);
});

if (env.nodeEnv === 'development') {
  mongoose.set('debug', true);
}

export async function connectDB(): Promise<typeof mongoose> {
  return mongoose.connect(env.mongoUri);
}
