import mongoose from 'mongoose';
import { env } from './env';
import { detectTransactionSupport } from './transactions';

mongoose.connection.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error(`MongoDB connection error: ${err}`);
  process.exit(1);
});

if (env.nodeEnv === 'development') {
  mongoose.set('debug', true);
}

export async function connectDB(): Promise<typeof mongoose> {
  const connection = await mongoose.connect(env.mongoUri);
  if (await detectTransactionSupport()) {
    // eslint-disable-next-line no-console
    console.log('MongoDB supports transactions: money movements are atomic');
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      'WARNING: MongoDB is a standalone server without transaction support. Money movements ' +
        'run step by step, and a crash mid-movement can leave balances and the ledger out of ' +
        'step. Use a replica set (e.g. MongoDB Atlas) in production.',
    );
  }
  return connection;
}
