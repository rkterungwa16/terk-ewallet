import { ICustomer } from '../../models/customer.model';

declare global {
  namespace Express {
    interface Request {
      customer?: ICustomer;
      /** Raw request body, captured only for the Paystack webhook route so its signature can be verified. */
      rawBody?: Buffer;
    }
  }
}

export {};
