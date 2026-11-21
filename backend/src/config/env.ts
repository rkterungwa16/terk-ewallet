/**
 * Central place to read process.env.
 *
 * We don't ship a .env loader as a dependency: Node 20.12+ can load a .env
 * file natively via process.loadEnvFile. The path is resolved from this file
 * (not the working directory), so the server starts the same way no matter
 * where it's launched from. Variables already set in the environment win.
 * This module then validates and types what we read from process.env once
 * at boot.
 */

import { existsSync } from 'fs';
import path from 'path';

const envFile = path.resolve(__dirname, '../../.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: Number(optional('PORT', '4000')),

  mongoUri: required('MONGO_URI'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresInMinutes: Number(optional('JWT_EXPIRES_IN_MINUTES', '60')),

  paystackSecretKey: required('PAYSTACK_SECRET_KEY'),
  paystackPublicKey: optional('PAYSTACK_PUBLIC_KEY', ''),
  paystackCallbackUrl: optional('PAYSTACK_CALLBACK_URL', ''),
  // how long to wait for any single Paystack API call before giving up
  paystackTimeoutMs: Number(optional('PAYSTACK_TIMEOUT_MS', '10000')),
  // how often to check withdrawals stuck in pending against Paystack (0 disables)
  reconcileIntervalMs: Number(optional('RECONCILE_INTERVAL_MS', '300000')),
  // how old a pending withdrawal must be before the reconciler looks at it
  reconcileMinAgeMs: Number(optional('RECONCILE_MIN_AGE_MS', '900000')),

  // Keep idle keep-alive sockets open longer than the platform proxy does,
  // so the proxy never reuses a socket Node has just closed (a classic
  // source of intermittent 502s). Node's default is 5s; most proxies and
  // load balancers idle out at 60s.
  keepAliveTimeoutMs: Number(optional('KEEP_ALIVE_TIMEOUT_MS', '65000')),
  // On SIGTERM/SIGINT, how long in-flight requests get to finish before
  // remaining connections are cut and the process exits anyway
  shutdownTimeoutMs: Number(optional('SHUTDOWN_TIMEOUT_MS', '10000')),

  // comma-separated list of browser origins allowed to call the API
  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export const isProduction = env.nodeEnv === 'production';
