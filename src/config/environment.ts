import { z } from 'zod';

// Environment variable schema
const EnvironmentSchema = z.object({
  SQUARE_ACCESS_TOKEN: z.string().min(1, 'Square access token is required'),
  AUTH_TOKEN: z.string().min(1, 'Auth token is required'),
  SQUARE_API_VERSION: z.string().min(1, 'Square API version is required'),
  ENVIRONMENT: z.string().default('development'),
  DEFAULT_TIMEZONE: z.string().default('America/Edmonton'),
  SQUARE_LOCATION_ID: z.string().min(1, 'Square location ID is required'),
});

export type Environment = z.infer<typeof EnvironmentSchema>;

/**
 * Validate and parse environment variables
 */
export function validateEnvironment(env: unknown): Environment {
  const result = EnvironmentSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  return result.data;
}

/**
 * Configuration object with default values
 */
export const config = {
  api: {
    baseUrl: 'https://connect.squareup.com/v2',
    timeout: 30000,
  },
  booking: {
    defaultServiceDuration: 3600000, // 1 hour in milliseconds
    bufferTime: 120000, // 2 minutes in milliseconds
  },
  timezone: {
    default: 'America/Edmonton',
  },
} as const;

export type Config = typeof config;
