import { Customer, ICustomer } from '../models/customer.model';
import { hashPassword, verifyPassword } from '../utils/password';
import { jwt } from '../utils/jwt';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { httpStatus } from '../utils/httpStatus';

function issueToken(customer: ICustomer): { accessToken: string; expiresInMinutes: number } {
  const accessToken = jwt.sign({ sub: customer.id as string }, env.jwtSecret, env.jwtExpiresInMinutes * 60);
  return { accessToken, expiresInMinutes: env.jwtExpiresInMinutes };
}

export const authService = {
  async register(params: { email: string; password: string; name?: string }) {
    const existing = await Customer.findOne({ email: params.email.toLowerCase() }).exec();
    if (existing) {
      throw new ApiError('An account with this email already exists', httpStatus.CONFLICT);
    }

    const passwordHash = await hashPassword(params.password);
    const customer = await Customer.create({
      email: params.email,
      passwordHash,
      name: params.name,
    });

    return { customer, ...issueToken(customer) };
  },

  async login(params: { email: string; password: string }) {
    const customer = await Customer.findOne({ email: params.email.toLowerCase() }).exec();
    if (!customer || !(await verifyPassword(params.password, customer.passwordHash))) {
      throw new ApiError('Incorrect email or password', httpStatus.UNAUTHORIZED);
    }

    return { customer, ...issueToken(customer) };
  },
};
