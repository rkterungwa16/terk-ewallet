import mongoose from 'mongoose';
import { env } from './config/env';
import { connectDB } from './config/db';
import { createApp } from './config/express';
import { startWithdrawalReconciler } from './services/reconcile.service';

async function main() {
  await connectDB();
  // eslint-disable-next-line no-console
  console.log('Connected to MongoDB');

  const app = createApp();
  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server started on port ${env.port} (${env.nodeEnv})`);
  });

  const stopReconciler =
    env.reconcileIntervalMs > 0
      ? startWithdrawalReconciler(env.reconcileIntervalMs, env.reconcileMinAgeMs)
      : () => {};

  const shutdown = (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`${signal} received, shutting down`);
    stopReconciler();
    server.close(() => {
      mongoose.disconnect().finally(() => process.exit(0));
    });
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});
