import crypto from 'node:crypto';
import { Customer, ICustomer } from '../models/customer.model';
import { hashPassword, verifyPassword } from '../utils/password';
import { jwt } from '../utils/jwt';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { httpStatus } from '../utils/httpStatus';

function issueToken(customer: ICustomer): { accessToken: string; expiresInMinutes: number } {
  const accessToken = jwt.sign(
    { sub: customer.id as string },
    env.jwtSecret,
    env.jwtExpiresInMinutes * 60,
  );
  return { accessToken, expiresInMinutes: env.jwtExpiresInMinutes };
}

// A real scrypt hash of a random password, made once, so a login for an
// unknown email costs the same as one for a known email.
let dummyHashPromise: Promise<string> | undefined;
function dummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(crypto.randomBytes(32).toString('hex'));
  return dummyHashPromise;
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
    // Always run scrypt, even for an unknown email: answering those
    // instantly would let anyone tell registered emails apart by timing.
    const passwordOk = await verifyPassword(
      params.password,
      customer ? customer.passwordHash : await dummyHash(),
    );
    if (!customer || !passwordOk) {
      throw new ApiError('Incorrect email or password', httpStatus.UNAUTHORIZED);
    }

    return { customer, ...issueToken(customer) };
  },
};
