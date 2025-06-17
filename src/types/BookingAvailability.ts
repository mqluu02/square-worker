export type BookingAvailabilies = BookingAvailability[];

export interface BookingAvailability {
  start_at: string; // RFC-3339 format from Square API
  location_id: string;
  appointment_segments: AppointmentSegment[];
}

export interface AppointmentSegment {
  duration_minutes: number;
  team_member_id: string;
  service_variation_id: string;
  service_variation_version: number;
}
