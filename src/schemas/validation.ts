import { z } from 'zod';

// Appointment booking schema
export const AppointmentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required').optional(),
  phone: z.string().optional(),
  teamMemberName: z.string().optional(),
  customerNote: z.string().optional(),
  serviceName: z.string().min(1, 'Service name is required'),
  startAt: z.string().min(1, 'Start time is required'), // RFC-3339 format
});

// Date/time parsing schema
export const ParseDateTimeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z.string().regex(/^\d{1,2}:\d{2}$/, 'Time must be in HH:MM format'),
  timezone: z.string().optional().default('America/Edmonton'),
});

// Availability query schema
export const AvailabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  serviceName: z.string().min(1, 'Service name is required'),
  timezone: z.string().optional().default('America/Edmonton'),
});

// Availability array request schema
export const AvailabilityArraySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  timezone: z.string().optional().default('America/Edmonton'),
  serviceName: z.string().min(1, 'Service name is required'),
});

// Export types
export type AppointmentRequest = z.infer<typeof AppointmentSchema>;
export type ParseDateTimeRequest = z.infer<typeof ParseDateTimeSchema>;
export type AvailabilityQuery = z.infer<typeof AvailabilityQuerySchema>;
export type AvailabilityArrayRequest = z.infer<typeof AvailabilityArraySchema>;
