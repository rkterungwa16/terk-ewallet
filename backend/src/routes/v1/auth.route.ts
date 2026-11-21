import { Router } from 'express';
import * as authController from '../../controllers/auth.controller';
import { validate } from '../../validations/validate';
import { loginSchema, registerSchema } from '../../validations/auth.validation';
import { limitLoginFailures, rateLimitByIp } from '../../middlewares/rateLimit.middleware';
import { env } from '../../config/env';

export const authRouter = Router();

// Each login and registration runs scrypt, which is deliberately slow and
// shares a thread pool with DNS lookups. Capping attempts keeps floods and
// password guessing from tying it up.
authRouter.use(rateLimitByIp(env.authRateLimitPerMinute, 60 * 1000));

// POST /v1/auth/register — create a customer + wallet, returns a JWT
authRouter.post('/register', validate(registerSchema), authController.register);

// POST /v1/auth/login — exchange email/password for a JWT
authRouter.post(
  '/login',
  validate(loginSchema),
  limitLoginFailures(env.loginFailuresPer15Min, 15 * 60 * 1000),
  authController.login,
);
