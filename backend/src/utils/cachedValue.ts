/**
 * Caches the result of an async loader in memory for `ttlMs`.
 *
 * - Concurrent callers during a refresh share one in-flight load instead
 *   of each calling the loader.
 * - Failures are never cached. If a refresh fails but an expired value is
 *   still held, that stale value is returned instead (data that changes
 *   rarely beats an error). With nothing cached, the error is rethrown.
 *
 * The cache is per process, which is fine for slow-changing reference
 * data like Paystack's bank list.
 */
export function cachedValue<T>(loader: () => Promise<T>, ttlMs: number): () => Promise<T> {
  let value: T | undefined;
  let loadedAt = 0;
  let inFlight: Promise<T> | undefined;

  return () => {
    if (value !== undefined && Date.now() - loadedAt < ttlMs) {
      return Promise.resolve(value);
    }

    if (!inFlight) {
      inFlight = loader()
        .then((fresh) => {
          value = fresh;
          loadedAt = Date.now();
          return fresh;
        })
        .catch((err) => {
          if (value !== undefined) return value;
          throw err;
        })
        .finally(() => {
          inFlight = undefined;
        });
    }
    return inFlight;
  };
}
