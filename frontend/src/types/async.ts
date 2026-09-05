/**
 * PATTERN: Discriminated union as a state machine for async operations.
 *
 * The naive way to track a fetch is three booleans plus a data slot:
 *
 *   const [loading, setLoading] = useState(false);
 *   const [error, setError] = useState<string | null>(null);
 *   const [data, setData] = useState<T | null>(null);
 *
 * That representation allows IMPOSSIBLE states to be constructed —
 * loading=true AND error="x" AND data=<stale value> all at once — and every
 * consumer has to remember the right precedence order to check them in.
 *
 * A discriminated union makes the illegal states unrepresentable: each
 * variant only carries the fields that are actually valid for it, and the
 * `status` field is the "tag" TypeScript uses to narrow which variant you're
 * looking at (see the `isSuccess`/`isFailure` guards below, and the
 * exhaustive `switch` in useApiRequest.ts).
 *
 * GENERICS: `AsyncState<TData, TError>` is generic over what a successful
 * result carries and what an error looks like, so the exact same state
 * machine describes "fetching a Customer", "fetching Transaction[]",
 * "submitting a login form", etc. — one definition, many concrete shapes,
 * each fully type-checked at its call site.
 */
export type AsyncState<TData, TError = ApiErrorShape> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: TData }
  | { status: 'error'; error: TError };

export interface ApiErrorShape {
  message: string;
  status: number;
  errors?: { field: string; message: string }[];
}

// ---- Type guards (TYPE NARROWING) ------------------------------------------
//
// These narrow `AsyncState<TData, TError>` down to one specific variant.
// Because the union's variants are distinguished by the literal `status`
// field, TypeScript can narrow on its own inside an `if(state.status ===
// 'success')` block — these named guards exist purely for readability at
// call sites (`if (isSuccess(state)) return state.data`).

export function isSuccess<TData, TError>(
  state: AsyncState<TData, TError>,
): state is Extract<AsyncState<TData, TError>, { status: 'success' }> {
  return state.status === 'success';
}

export function isError<TData, TError>(
  state: AsyncState<TData, TError>,
): state is Extract<AsyncState<TData, TError>, { status: 'error' }> {
  return state.status === 'error';
}

export function isLoading<TData, TError>(state: AsyncState<TData, TError>): boolean {
  return state.status === 'loading';
}

/**
 * CONDITIONAL TYPE: pulls the `data` type out of an AsyncState without the
 * caller having to repeat it. `infer D` asks the compiler "if this type
 * matches the success shape, bind whatever `D` is there and give it back to
 * me" — this is how utilities like `Awaited<T>` or `ReturnType<T>` work
 * under the hood in the standard library, applied here to our own union.
 */
export type DataOf<TState> = TState extends { status: 'success'; data: infer D } ? D : never;

/**
 * Exhaustiveness helper. If a new AsyncState variant is ever added and a
 * `switch` isn't updated to handle it, the `default: assertNever(state)`
 * branch fails to compile — `state` will have a real type there instead of
 * `never`, and that real type isn't assignable to the `never` parameter.
 * This turns "forgot to handle a case" from a runtime bug into a compile
 * error. See useApiRequest's reducer for the switch this backs.
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled discriminated union member: ${JSON.stringify(value)}`);
}
