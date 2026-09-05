import { Router } from 'express';
import * as authController from '../../controllers/auth.controller';
import { validate } from '../../validations/validate';
import { loginSchema, registerSchema } from '../../validations/auth.validation';

export const authRouter = Router();

// POST /v1/auth/register — create a customer + wallet, returns a JWT
authRouter.post('/register', validate(registerSchema), authController.register);

// POST /v1/auth/login — exchange email/password for a JWT
authRouter.post('/login', validate(loginSchema), authController.login);
