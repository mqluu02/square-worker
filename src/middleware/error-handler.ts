import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * Global error handler middleware
 */
export function errorHandler(error: Error, c: Context) {
  // Log error for debugging (disabled in production)
  if (c.env?.ENVIRONMENT !== 'production') {
    // eslint-disable-next-line no-console
    console.error('API Error:', error);
  }

  const timestamp = new Date().toISOString();

  // Handle HTTPException from Hono
  if (error instanceof HTTPException) {
    const status = error.status;
    const message = error.message || 'An error occurred';

    const response: ErrorResponse = {
      success: false,
      error: {
        message,
        code: `HTTP_${status}`,
      },
      timestamp,
    };

    return c.json(response, status);
  }

  // Handle validation errors
  if (error.name === 'ZodError') {
    const response: ErrorResponse = {
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.message,
      },
      timestamp,
    };

    return c.json(response, 400);
  }

  // Handle generic errors
  const response: ErrorResponse = {
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    timestamp,
  };

  return c.json(response, 500);
}
