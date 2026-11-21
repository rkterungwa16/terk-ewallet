import { AuthCustomer } from '../../models/customer.model';

declare global {
  namespace Express {
    interface Request {
      customer?: AuthCustomer;
      /** Raw request body, captured only for the Paystack webhook route so its signature can be verified. */
      rawBody?: Buffer;
    }
  }
}

export {};
