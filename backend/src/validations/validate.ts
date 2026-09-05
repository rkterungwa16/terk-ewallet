import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { httpStatus } from '../utils/httpStatus';

/**
 * A deliberately minimal stand-in for Joi/express-validation. Each field
 * gets a list of check functions; a check returns an error string on
 * failure, or undefined/null when the value is fine.
 */

export type FieldCheck = (value: unknown) => string | undefined;

export type Schema = Record<string, FieldCheck[]>;

export interface RequestSchema {
  body?: Schema;
  query?: Schema;
  params?: Schema;
}

function runSchema(schema: Schema, source: Record<string, unknown>) {
  const errors: { field: string; message: string }[] = [];

  for (const [field, checks] of Object.entries(schema)) {
    const value = source ? source[field] : undefined;
    for (const check of checks) {
      const message = check(value);
      if (message) {
        errors.push({ field, message });
        break; // stop at first failing check for this field
      }
    }
  }

  return errors;
}

export function validate(schema: RequestSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors = [
      ...(schema.body ? runSchema(schema.body, req.body ?? {}) : []),
      ...(schema.query
        ? runSchema(schema.query, (req.query as Record<string, unknown>) ?? {})
        : []),
      ...(schema.params ? runSchema(schema.params, req.params ?? {}) : []),
    ];

    if (errors.length > 0) {
      return next(new ApiError('Validation error', httpStatus.BAD_REQUEST, errors));
    }

    return next();
  };
}

// ---- Reusable field checks -------------------------------------------------

export const required =
  (label = 'This field'): FieldCheck =>
  (value) =>
    value === undefined || value === null || value === '' ? `${label} is required` : undefined;

export const isString =
  (label = 'This field'): FieldCheck =>
  (value) =>
    value !== undefined && typeof value !== 'string' ? `${label} must be a string` : undefined;

export const isEmail =
  (label = 'Email'): FieldCheck =>
  (value) => {
    if (value === undefined) return undefined;
    const ok = typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    return ok ? undefined : `${label} must be a valid email address`;
  };

export const minLength =
  (min: number, label = 'This field'): FieldCheck =>
  (value) => {
    if (value === undefined) return undefined;
    return typeof value === 'string' && value.length >= min
      ? undefined
      : `${label} must be at least ${min} characters`;
  };

export const maxLength =
  (max: number, label = 'This field'): FieldCheck =>
  (value) => {
    if (value === undefined) return undefined;
    return typeof value === 'string' && value.length <= max
      ? undefined
      : `${label} must be at most ${max} characters`;
  };

export const isNumber =
  (label = 'This field'): FieldCheck =>
  (value) =>
    value !== undefined && typeof value !== 'number' ? `${label} must be a number` : undefined;

export const min =
  (minimum: number, label = 'This field'): FieldCheck =>
  (value) => {
    if (value === undefined) return undefined;
    return typeof value === 'number' && value >= minimum
      ? undefined
      : `${label} must be at least ${minimum}`;
  };

export const max =
  (maximum: number, label = 'This field'): FieldCheck =>
  (value) => {
    if (value === undefined) return undefined;
    return typeof value === 'number' && value <= maximum
      ? undefined
      : `${label} must be at most ${maximum}`;
  };

export const isOneOf =
  (allowed: string[], label = 'This field'): FieldCheck =>
  (value) => {
    if (value === undefined) return undefined;
    return typeof value === 'string' && allowed.includes(value)
      ? undefined
      : `${label} must be one of: ${allowed.join(', ')}`;
  };

export const matches =
  (pattern: RegExp, label = 'This field'): FieldCheck =>
  (value) => {
    if (value === undefined) return undefined;
    return typeof value === 'string' && pattern.test(value) ? undefined : `${label} is invalid`;
  };
