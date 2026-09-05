import { Router } from 'express';
import { authRouter } from './auth.route';
import { customerRouter } from './customer.route';
import { walletRouter } from './wallet.route';

export const v1Router = Router();

v1Router.use('/auth', authRouter);
v1Router.use('/customers', customerRouter);
v1Router.use('/wallet', walletRouter);
