import { Schema, model } from 'mongoose';

interface ICounter {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 1000 },
});

const Counter = model<ICounter>('Counter', counterSchema);

/**
 * Atomically increments and returns the next value for a named sequence.
 * Used to hand out human-friendly, sequential wallet account numbers
 * without pulling in a dedicated auto-increment package.
 */
export async function nextSequence(name: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  ).exec();
  return counter!.seq;
}
