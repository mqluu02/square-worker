import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { Environment } from '../config/environment';

export interface AuthContext {
  Bindings: Environment;
}

/**
 * Authentication middleware that validates Bearer token
 */
export const authMiddleware = createMiddleware<AuthContext>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    throw new HTTPException(401, { message: 'Authorization header is required' });
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Authorization header must use Bearer token' });
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  if (token !== c.env.AUTH_TOKEN) {
    throw new HTTPException(401, { message: 'Invalid or expired token' });
  }

  await next();
});
