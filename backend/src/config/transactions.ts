import mongoose, { ClientSession } from 'mongoose';

/**
 * Multi-document MongoDB transactions, for money movements that touch
 * several documents (a debit plus a credit plus ledger rows) and must
 * happen all together or not at all.
 *
 * Transactions need a replica set or sharded cluster (Atlas always is one;
 * a plain standalone `mongod` is not). Support is detected once at startup.
 * On a standalone server `withTransaction` falls back to running the steps
 * without a transaction, which is the behavior before this existed, so
 * deploying against either kind of server keeps working.
 */

let supported = false;

export async function detectTransactionSupport(): Promise<boolean> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('detectTransactionSupport() called before connecting');
  const hello = await db.admin().command({ hello: 1 });
  supported = Boolean(hello.setName) || hello.msg === 'isdbgrid';
  return supported;
}

export function transactionsSupported(): boolean {
  return supported;
}

/**
 * Runs `fn` inside a transaction and returns its result. Every database
 * call in `fn` must pass the given `session`. On transient errors (for
 * example a write conflict with a concurrent transaction), Mongoose retries
 * `fn` from the start, so `fn` must not have side effects outside the
 * database, such as calling Paystack.
 *
 * Without transaction support, `session` is undefined and `fn` simply runs.
 */
export async function withTransaction<T>(
  fn: (session: ClientSession | undefined) => Promise<T>,
): Promise<T> {
  if (!supported) return fn(undefined);

  let result!: T;
  await mongoose.connection.transaction(async (session) => {
    result = await fn(session);
  });
  return result;
}
