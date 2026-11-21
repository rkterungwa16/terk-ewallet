import { ServerResponse } from 'node:http';
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

  server.keepAliveTimeout = env.keepAliveTimeoutMs;
  // must exceed keepAliveTimeout, or Node can drop a reused socket while
  // the next request's headers are still arriving
  server.headersTimeout = env.keepAliveTimeoutMs + 1000;

  const stopReconciler =
    env.reconcileIntervalMs > 0
      ? startWithdrawalReconciler(env.reconcileIntervalMs, env.reconcileMinAgeMs)
      : async () => {};

  let shuttingDown = false;

  // Responses still being worked on. On shutdown each one that hasn't sent
  // its headers yet gets `Connection: close`, so its keep-alive socket is
  // closed as soon as it finishes instead of lingering for the full
  // keepAliveTimeout. Requests that arrive while draining get it too. The
  // listener is prepended so it runs before Express writes any headers.
  const inFlight = new Set<ServerResponse>();
  const closeAfterResponse = (res: ServerResponse) => {
    if (!res.headersSent) res.setHeader('Connection', 'close');
  };
  server.prependListener('request', (_req, res) => {
    if (shuttingDown) closeAfterResponse(res);
    inFlight.add(res);
    res.on('close', () => inFlight.delete(res));
  });

  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      // eslint-disable-next-line no-console
      console.log(`${signal} received again, exiting now`);
      process.exit(1);
    }
    shuttingDown = true;
    // eslint-disable-next-line no-console
    console.log(`${signal} received, shutting down`);

    // Don't let a stuck request (e.g. waiting on Paystack) hold the
    // process open forever: after the deadline, cut what's left and exit.
    const deadline = setTimeout(() => {
      // eslint-disable-next-line no-console
      console.error(`shutdown took over ${env.shutdownTimeoutMs}ms, forcing exit`);
      server.closeAllConnections();
      process.exit(1);
    }, env.shutdownTimeoutMs);
    deadline.unref();

    // Stop accepting connections and close idle keep-alive sockets now;
    // in-flight requests are allowed to finish, then their sockets close.
    inFlight.forEach(closeAfterResponse);
    const serverClosed = new Promise<void>((resolve) => server.close(() => resolve()));
    server.closeIdleConnections();

    // Wait for in-flight requests and any running reconciler pass before
    // the database goes away underneath them.
    await Promise.all([serverClosed, stopReconciler()]);
    await mongoose.disconnect();
    clearTimeout(deadline);
    // eslint-disable-next-line no-console
    console.log('Shutdown complete');
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});
