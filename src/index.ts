/**
 * Square Booking API - Professional Cloudflare Worker
 *
 * A clean, modular booking API that interfaces with Square's appointment booking system.
 * Built with Hono, TypeScript, and modern development practices.
 *
 * API Endpoints:
 * - GET /services - List all appointment services
 * - GET /services/names - Get service names only
 * - GET /team-members - List all team members
 * - GET /availability - Check availability for date/service
 * - GET /availability-times - Get available times grouped by period
 * - POST /availability-array - Bulk availability checking
 * - POST /appointment - Create new booking
 * - POST /parse_date_time - Parse and validate date/time
 */

import { Hono } from 'hono';
import { validator } from 'hono/validator';
import { HTTPException } from 'hono/http-exception';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { validateEnvironment, config } from './config/environment';
import { SquareApiService } from './services/square-api';
import { BookingService } from './services/booking-service';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';
import { groupTimesByPeriod, formatAvailabilitiesToTimes } from './utils/time-utils';
import {
  AppointmentSchema,
  ParseDateTimeSchema,
  AvailabilityArraySchema,
} from './schemas/validation';

// Environment interface (for Cloudflare Workers)
export interface Env {
  SQUARE_ACCESS_TOKEN: string;
  AUTH_TOKEN: string;
  SQUARE_API_VERSION: string;
  ENVIRONMENT?: string;
  DEFAULT_TIMEZONE?: string;
  SQUARE_LOCATION_ID: string;
}

// Initialize Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'https://your-domain.com'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Error handling middleware
app.onError(errorHandler);

// Authentication middleware for all routes
app.use('*', authMiddleware);

// Health check endpoint (public)
app.get('/health', async c => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development',
  });
});

// Services endpoints
app.get('/services/names', async c => {
  const env = validateEnvironment(c.env);
  const squareApi = new SquareApiService(env, config);
  const bookingService = new BookingService(env, squareApi);

  const services = await bookingService.getServices(false);
  const serviceNames = services.map(s => s.name).filter(Boolean);

  return c.json({
    success: true,
    data: { services: serviceNames },
    count: serviceNames.length,
  });
});

app.get('/services', async c => {
  const env = validateEnvironment(c.env);
  const squareApi = new SquareApiService(env, config);
  const bookingService = new BookingService(env, squareApi);

  const services = await bookingService.getServices(true);
  const sortedServices = services.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return c.json({
    success: true,
    data: { services: sortedServices },
    count: sortedServices.length,
  });
});

// Team members endpoint
app.get('/team-members', async c => {
  const env = validateEnvironment(c.env);
  const squareApi = new SquareApiService(env, config);
  const bookingService = new BookingService(env, squareApi);

  const teamMembers = await bookingService.getTeamMembers();

  return c.json({
    success: true,
    data: teamMembers,
    count: teamMembers.length,
  });
});

// Availability endpoints
app.get('/availability', async c => {
  const date = c.req.query('date');
  const serviceName = c.req.query('serviceName');

  if (!date || !serviceName) {
    throw new HTTPException(400, {
      message: 'Missing required query params: date, serviceName',
    });
  }

  const env = validateEnvironment(c.env);
  const squareApi = new SquareApiService(env, config);
  const bookingService = new BookingService(env, squareApi);

  const availabilities = await bookingService.getAvailability(date, serviceName);

  return c.json({
    success: true,
    data: availabilities,
    count: availabilities.length,
  });
});

app.get('/availability-times', async c => {
  const date = c.req.query('date');
  const serviceName = c.req.query('serviceName');
  const timezone = c.req.query('timezone') || c.env.DEFAULT_TIMEZONE || 'America/Edmonton';

  if (!date || !serviceName) {
    throw new HTTPException(400, {
      message: 'Missing required query params: date, serviceName',
    });
  }

  const env = validateEnvironment(c.env);
  const squareApi = new SquareApiService(env, config);
  const bookingService = new BookingService(env, squareApi);

  const availabilities = await bookingService.getAvailability(date, serviceName);
  const timeBuckets = groupTimesByPeriod(availabilities, timezone);

  return c.json({
    success: true,
    data: { result: timeBuckets },
  });
});

app.post(
  '/availability-array',
  validator('json', value => {
    const parsed = AvailabilityArraySchema.safeParse(value);
    if (!parsed.success) {
      throw new HTTPException(400, {
        message: 'Validation failed: ' + parsed.error.errors.map(e => e.message).join(', '),
      });
    }
    return parsed.data;
  }),
  async c => {
    const payload = c.req.valid('json');

    const env = validateEnvironment(c.env);
    const squareApi = new SquareApiService(env, config);
    const bookingService = new BookingService(env, squareApi);

    const availabilities = await bookingService.getAvailability(payload.date, payload.serviceName);

    const times = formatAvailabilitiesToTimes(availabilities, payload.timezone);

    return c.json({
      success: true,
      data: times,
      count: times.length,
    });
  }
);

// Date/time parsing endpoint
app.post(
  '/parse_date_time',
  validator('form', value => {
    const parsed = ParseDateTimeSchema.safeParse(value);
    if (!parsed.success) {
      throw new HTTPException(400, {
        message: 'Validation failed: ' + parsed.error.errors.map(e => e.message).join(', '),
      });
    }
    return parsed.data;
  }),
  async c => {
    const payload = c.req.valid('form');

    const env = validateEnvironment(c.env);
    const squareApi = new SquareApiService(env, config);
    const bookingService = new BookingService(env, squareApi);

    const dateTime = bookingService.parseDateTime(payload.date, payload.time, payload.timezone);

    return c.json({
      success: true,
      data: { isoDate: dateTime },
    });
  }
);

// Appointment booking endpoint
app.post(
  '/appointment',
  validator('json', value => {
    const parsed = AppointmentSchema.safeParse(value);
    if (!parsed.success) {
      throw new HTTPException(400, {
        message: 'Validation failed: ' + parsed.error.errors.map(e => e.message).join(', '),
      });
    }
    return parsed.data;
  }),
  async c => {
    const payload = c.req.valid('json');

    const env = validateEnvironment(c.env);
    const squareApi = new SquareApiService(env, config);
    const bookingService = new BookingService(env, squareApi);

    const result = await bookingService.createBooking(payload);

    return c.json(
      {
        success: true,
        data: result,
        message: 'Booking created successfully',
      },
      201
    );
  }
);

// 404 handler
app.notFound(c => {
  return c.json(
    {
      success: false,
      error: {
        message: 'Endpoint not found',
        code: 'NOT_FOUND',
      },
      timestamp: new Date().toISOString(),
    },
    404
  );
});

export default app;
