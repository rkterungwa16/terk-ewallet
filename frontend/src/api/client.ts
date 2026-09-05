import { authStore } from './authStore';
import type { ApiErrorShape } from '../types/async';
import type { RequestBody, Immutable } from '../types/utility';

// UNION TYPE: a closed set of the methods this client actually supports.
// Using a union instead of `string` means a typo like 'GTE' is a compile
// error, and it's what RequestBody<TMethod, TBody> (a CONDITIONAL TYPE)
// switches on below.
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface AppConfigShape {
  apiBaseUrl: string;
}

// Built-in utility type in action: `Immutable<T>` (our own mapped type,
// defined in types/utility.ts) makes every property readonly, so nothing
// downstream can accidentally reassign `config.apiBaseUrl`.
const config: Immutable<AppConfigShape> = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/v1',
};

/**
 * Custom error class carrying the structured error the backend already
 * gives us (see api/utils/ApiError.ts on the server). Extending `Error`
 * keeps `instanceof Error` working everywhere else in the app (logging,
 * error boundaries) while attaching the extra fields callers actually want.
 */
export class ApiError extends Error {
  readonly status: number;

  readonly fieldErrors?: ApiErrorShape['errors'];

  constructor(shape: ApiErrorShape) {
    super(shape.message);
    this.name = 'ApiError';
    this.status = shape.status;
    this.fieldErrors = shape.errors;
  }
}

/**
 * TYPE NARROWING a value of type `unknown`.
 *
 * `response.json()` and `JSON.parse` are both typed as returning `any` by
 * lib.dom.d.ts, which we deliberately don't trust — we re-type the parsed
 * body as `unknown` (see parseJsonSafely below) and narrow it with this
 * guard before touching any of its fields. `unknown` is the type-safe
 * counterpart to `any`: you can hold an `unknown` value, but the compiler
 * forces you to prove what it is (via a guard like this one, or an `as`
 * assertion) before you can use it as anything more specific.
 */
function isApiErrorShape(value: unknown): value is ApiErrorShape {
  return (
    typeof value === 'object'
    && value !== null
    && 'message' in value
    && typeof (value as { message: unknown }).message === 'string'
  );
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

interface ApiFetchOptions<TMethod extends HttpMethod, TBody> {
  method: TMethod;
  path: string;
  // RequestBody<TMethod, TBody> is `undefined` for GET/DELETE and `TBody`
  // otherwise — see types/utility.ts. This is what makes
  // `apiFetch({ method: 'GET', body: {...} })` a compile error.
  body?: RequestBody<TMethod, TBody>;
  signal?: AbortSignal;
  /** Set false for the two auth endpoints that run before a token exists. */
  authenticated?: boolean;
}

/**
 * GENERICS: `TResponse` is what the *caller* expects back (inferred at the
 * call site from how the result is used, or given explicitly —
 * `apiFetch<Customer>(...)`), while `TMethod`/`TBody` describe the request.
 * One function signature, fully type-checked for every endpoint in the
 * API, with no per-endpoint duplication of fetch/error-handling logic.
 */
export async function apiFetch<TResponse, TMethod extends HttpMethod = 'GET', TBody = undefined>(
  options: ApiFetchOptions<TMethod, TBody>,
): Promise<TResponse> {
  const { method, path, body, signal, authenticated = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authenticated) {
    const token = authStore.getSnapshot();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const parsed = await parseJsonSafely(response);

  if (!response.ok) {
    if (isApiErrorShape(parsed)) {
      throw new ApiError({ ...parsed, status: parsed.status ?? response.status });
    }
    throw new ApiError({ message: response.statusText || 'Request failed', status: response.status });
  }

  return parsed as TResponse;
}
