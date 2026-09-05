/**
 * Central place to read process.env.
 *
 * We don't ship a .env loader as a dependency: Node 20.6+ can load a .env
 * file natively via `node --env-file=.env dist/index.js` (see package.json
 * scripts). This module just validates and types what we read from
 * process.env once at boot.
 */

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
};

export const isProduction = env.nodeEnv === 'production';
