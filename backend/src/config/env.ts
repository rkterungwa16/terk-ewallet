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

  // comma-separated list of browser origins allowed to call the API
  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export const isProduction = env.nodeEnv === 'production';
