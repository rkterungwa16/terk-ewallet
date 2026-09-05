import { Router } from 'express';
import * as customerController from '../../controllers/customer.controller';
import { authenticate } from '../../middlewares/auth.middleware';

export const customerRouter = Router();

// GET /v1/customers/me — the logged-in customer's profile
customerRouter.get('/me', authenticate(), customerController.getProfile);
