/**
 * MAPPED TYPES, KEYOF, INDEXED ACCESS TYPES
 * -----------------------------------------
 * This file collects the small generic type-level helpers the forms rely
 * on. Utility types shipped by TypeScript itself (Pick, Omit, Partial,
 * Record, Readonly, ReturnType...) are used inline wherever they fit —
 * search the codebase for them — rather than re-exported from here; this
 * file is only for the couple of *custom* mapped/conditional types that
 * don't have a built-in equivalent.
 */

/**
 * MAPPED TYPE + KEYOF: builds a "parallel" object type with the same keys
 * as `T`, each optionally holding a validation error message.
 *
 * `[K in keyof T]` walks every key of `T` (`keyof T` is the union of `T`'s
 * property names — e.g. `keyof LoginPayload` is `'email' | 'password'`) and
 * produces a new property for each, of type `string | undefined`. This is
 * exactly the shape a form needs to report per-field errors, and it can
 * never drift out of sync with the payload type it's derived from — add a
 * field to the payload and its error slot appears here automatically.
 */
export type FormErrors<T> = {
  [K in keyof T]?: string;
};

/**
 * INDEXED ACCESS TYPE: `T[K]` reads the type of a single property out of
 * `T` by its key, the same way `obj[key]` reads a value out of an object at
 * runtime — just one level up, at the type level. Combined with a generic
 * `K extends keyof T`, this is what lets a single generic form-field
 * component be correctly typed for *any* field of *any* form model: the
 * field's value type is derived, not repeated. See components/ui/Field.tsx.
 */
export type FieldValue<T, K extends keyof T> = T[K];

/**
 * CONDITIONAL TYPE: chooses between two shapes based on an HTTP method.
 * Our API's GET calls never take a JSON body, so `RequestBody<'GET', X>`
 * collapses to `undefined` — trying to pass a body to a GET call becomes a
 * compile error instead of a silently-ignored runtime mistake. `apiFetch`
 * in src/api/client.ts is built on this.
 */
export type RequestBody<TMethod extends string, TBody> = TMethod extends 'GET' | 'DELETE'
  ? undefined
  : TBody;

/**
 * A small mapped type applied to an existing type: makes every property
 * read-only. Used for values read from config that must not be mutated by
 * a consumer — see AppConfig in src/api/client.ts.
 */
export type Immutable<T> = {
  readonly [K in keyof T]: T[K];
};
