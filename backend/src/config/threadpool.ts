/**
 * Must be the first import in index.ts.
 *
 * Node runs password hashing (crypto.scrypt) and DNS lookups (including the
 * ones made by fetch() to reach Paystack) on libuv's shared threadpool,
 * which has only 4 threads by default. A burst of logins could then queue
 * every Paystack call behind password hashing. The pool is created on first
 * use, so raising its size here, before anything touches it, takes effect.
 * A value set in the real environment wins.
 */
process.env.UV_THREADPOOL_SIZE ??= '16';

export {};
