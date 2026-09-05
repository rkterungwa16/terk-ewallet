export class ApiError extends Error {
  public readonly status: number;

  public readonly isOperational: boolean;

  public readonly errors?: unknown;

  constructor(message: string, status = 500, errors?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isOperational = true;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}
