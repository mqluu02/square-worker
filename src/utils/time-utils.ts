export interface TimeBucket {
  category: 'morning' | 'afternoon' | 'night';
  times: string[];
}

/**
 * Convert RFC-3339 time to a specific timezone format
 */
export function formatTimeInTimezone(isoString: string, timezone = 'America/Edmonton'): string {
  const date = new Date(isoString);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: timezone,
  });

  return formatter.format(date);
}

/**
 * Get hour from ISO string in specific timezone
 */
export function getHourInTimezone(isoString: string, timezone = 'America/Edmonton'): number {
  const date = new Date(isoString);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    hourCycle: 'h23',
    timeZone: timezone,
  });

  const parts = formatter.formatToParts(date);
  const hourPart = parts.find(p => p.type === 'hour');
  return hourPart ? parseInt(hourPart.value, 10) : 0;
}

/**
 * Group available times into time buckets (morning, afternoon, night)
 */
export function groupTimesByPeriod(
  availabilities: Array<{ start_at: string }>,
  timezone = 'America/Edmonton'
): TimeBucket[] {
  const buckets: Record<'morning' | 'afternoon' | 'night', string[]> = {
    morning: [],
    afternoon: [],
    night: [],
  };

  for (const availability of availabilities) {
    const hour = getHourInTimezone(availability.start_at, timezone);
    const time24 = formatTimeInTimezone(availability.start_at, timezone);

    if (hour < 12) {
      buckets.morning.push(time24);
    } else if (hour < 18) {
      buckets.afternoon.push(time24);
    } else {
      buckets.night.push(time24);
    }
  }

  return Object.entries(buckets)
    .filter(([, times]) => times.length > 0)
    .map(([category, times]) => ({
      category: category as 'morning' | 'afternoon' | 'night',
      times,
    }));
}

/**
 * Convert array of availabilities to timezone-formatted time strings
 */
export function formatAvailabilitiesToTimes(
  availabilities: Array<{ start_at: string }>,
  timezone = 'America/Edmonton'
): string[] {
  return availabilities.map(a =>
    new Date(a.start_at).toLocaleString('en-CA', { timeZone: timezone })
  );
}
