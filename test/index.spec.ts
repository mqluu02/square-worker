// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import worker from '../src/index';

// Mock environment variables for testing
const mockEnv = {
  SQUARE_ACCESS_TOKEN: 'test-token',
  AUTH_TOKEN: 'test-auth-token',
  SQUARE_API_VERSION: '2025-04-16',
  ENVIRONMENT: 'test',
  DEFAULT_TIMEZONE: 'America/Edmonton',
  SQUARE_LOCATION_ID: 'test-location-id',
};

// Type for API responses
interface ApiResponse {
  success?: boolean;
  status?: string;
  environment?: string;
  timestamp?: string;
  error?: {
    message: string;
    code?: string;
  };
}

describe('Square Booking API', () => {
  describe('Health Check', () => {
    it('should return health status without authentication', async () => {
      const request = new Request('http://localhost/health');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const data = (await response.json()) as ApiResponse;
      expect(data).toMatchObject({
        status: 'ok',
        environment: 'test',
      });
      expect(data).toHaveProperty('timestamp');
    });
  });

  describe('Authentication', () => {
    it('should require authentication for protected endpoints', async () => {
      const request = new Request('http://localhost/services');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(401);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      expect(data.error?.message).toContain('Authorization');
    });

    it('should accept valid bearer token', async () => {
      const request = new Request('http://localhost/services', {
        headers: { Authorization: 'Bearer test-auth-token' },
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      // Note: This will fail because we don't have real Square API access
      // But it should pass authentication and fail at the Square API level
      expect(response.status).not.toBe(401);
    });

    it('should reject invalid bearer token', async () => {
      const request = new Request('http://localhost/services', {
        headers: { Authorization: 'Bearer invalid-token' },
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(401);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      expect(data.error?.message).toContain('Invalid');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const request = new Request('http://localhost/unknown-endpoint', {
        headers: { Authorization: 'Bearer test-auth-token' },
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(404);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('Validation', () => {
    it('should validate appointment creation request', async () => {
      const invalidPayload = {
        firstName: '', // Invalid: empty string
        serviceName: 'Test Service',
        // Missing required lastName and startAt
      };

      const request = new Request('http://localhost/appointment', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-auth-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidPayload),
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      expect(data.error?.message).toContain('Validation failed');
    });

    it('should validate availability query parameters', async () => {
      const request = new Request('http://localhost/availability?date=invalid-date', {
        headers: { Authorization: 'Bearer test-auth-token' },
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const data = (await response.json()) as ApiResponse;
      expect(data.success).toBe(false);
      expect(data.error?.message).toContain('Missing required query params');
    });
  });

  describe('CORS', () => {
    it('should handle OPTIONS requests for CORS', async () => {
      const request = new Request('http://localhost/services', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:3000' },
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
    });
  });
});
