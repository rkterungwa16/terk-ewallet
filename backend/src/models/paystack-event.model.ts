import { Schema, model, Document } from 'mongoose';

export interface IPaystackEvent extends Document {
  event: string;
  reference: string;
  rawPayload: Record<string, unknown>;
  processedAt: Date;
}

const paystackEventSchema = new Schema<IPaystackEvent>({
  event: { type: String, required: true },
  reference: {
    type: String, required: true, unique: true, index: true,
  },
  rawPayload: { type: Schema.Types.Mixed, required: true },
  processedAt: { type: Date, default: Date.now },
});

/**
 * The unique index on `reference` is what makes webhook processing
 * idempotent: Paystack retries webhooks that don't get a 2xx quickly, and
 * charge.success can also race with our own /fund/verify polling endpoint.
 * Whichever one gets here first "wins"; the second attempt hits the unique
 * index and is treated as already-processed rather than double-crediting
 * the wallet.
 */
export const PaystackEvent = model<IPaystackEvent>('PaystackEvent', paystackEventSchema);
