import { HTTPException } from 'hono/http-exception';
import { DateTime } from 'luxon';
import type { Environment } from '../config/environment';
import { SquareApiService } from './square-api';
import type { CatalogItem } from '../types/CatalogItem';
import type { BookingAvailabilies } from '../types/BookingAvailability';
import type { BookingBody } from '../types/Booking';

export interface BookingRequest {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  teamMemberName?: string;
  customerNote?: string;
  serviceName: string;
  startAt: string; // RFC-3339 format
}

export interface ServiceInfo {
  id: string;
  service_variation_id: string;
  name?: string;
  pricing_type?: string;
  pricing_currency?: string;
  description?: string;
  imageUrl?: string;
  pricing_amount?: number;
  providers: Array<{
    id: string;
    name: string;
  }>;
}

export interface TeamMemberInfo {
  id: string;
  name: string;
}

export class BookingService {
  constructor(
    private env: Environment,
    private squareApi: SquareApiService
  ) {}

  /**
   * Load all appointment services with their details
   */
  async getServices(includeImages = false): Promise<ServiceInfo[]> {
    const [servicesMap, teamMembersMap] = await Promise.all([
      this.loadServicesByName(includeImages),
      this.loadTeamMembersByName(),
    ]);

    return [...servicesMap.values()].map(svc => ({
      id: svc.item.id,
      service_variation_id: svc.variationId,
      name: svc.item.item_data?.name,
      pricing_type: svc.pricing_type,
      pricing_currency: svc.price_money?.currency,
      description: svc.item.item_data?.description || ' ',
      imageUrl: svc.imageUrl,
      pricing_amount: (svc.price_money?.amount || 0.0) / 100.0,
      providers: svc.teamIds.map(tid => ({
        id: tid,
        name: [...teamMembersMap.values()].find(tm => tm.id === tid)?.given_name ?? 'Unknown',
      })),
    }));
  }

  /**
   * Get all team members
   */
  async getTeamMembers(): Promise<TeamMemberInfo[]> {
    const members = await this.loadTeamMembersByName();

    return [...members.values()].map(tm => ({
      id: tm.id,
      name: `${tm.given_name} ${tm.family_name ?? ''}`.trim(),
    }));
  }

  /**
   * Get availability for a specific service on a specific date
   */
  async getAvailability(date: string, serviceName: string): Promise<BookingAvailabilies> {
    const services = await this.loadServicesByName();
    const service = services.get(serviceName.toLowerCase());

    if (!service) {
      throw new HTTPException(404, { message: 'Service not found' });
    }

    const { start, end } = this.toDayRange(date);
    const body: BookingBody = {
      query: {
        filter: {
          location_id: this.env.SQUARE_LOCATION_ID,
          start_at_range: { start_at: start, end_at: end },
          segment_filters: [
            {
              service_variation_id: service.variationId,
              team_member_id_filter: { any: service.teamIds },
            },
          ],
        },
      },
    };

    const { availabilities } = (await this.squareApi.searchBookingAvailability(body)) as {
      availabilities: BookingAvailabilies;
    };

    return availabilities || [];
  }

  /**
   * Create a new booking
   */
  async createBooking(request: BookingRequest): Promise<{ booking: { id: string } }> {
    // Validate start date
    const date = new Date(request.startAt);
    if (isNaN(date.getTime())) {
      throw new HTTPException(400, { message: 'Invalid startAt date specified' });
    }

    // Load reference data
    const [services, members] = await Promise.all([
      this.loadServicesByName(),
      this.loadTeamMembersByName(),
    ]);

    // Resolve service
    const service = services.get(request.serviceName.toLowerCase());
    if (!service) {
      throw new HTTPException(400, { message: 'Service not found' });
    }

    // Resolve or choose team member
    let teamMemberId: string;

    if (request.teamMemberName) {
      const teamMember = members.get(request.teamMemberName.toLowerCase());
      if (!teamMember) {
        throw new HTTPException(404, { message: 'Team member not found' });
      }
      if (!service.teamIds.includes(teamMember.id)) {
        throw new HTTPException(400, { message: 'Team member does not offer this service' });
      }

      const isAvailable = await this.checkAvailability(
        service.variationId,
        request.startAt,
        teamMember.id
      );
      if (!isAvailable) {
        throw new HTTPException(409, { message: 'Team member is busy at the requested time' });
      }
      teamMemberId = teamMember.id;
    } else {
      const availableTeamMember = await this.findAvailableTeamMember(
        service.variationId,
        request.startAt
      );
      if (!availableTeamMember) {
        throw new HTTPException(409, {
          message: 'No team member is available for that service at the requested time',
        });
      }
      teamMemberId = availableTeamMember;
    }

    // Ensure customer exists
    const customerId = await this.ensureCustomer(
      request.firstName,
      request.lastName,
      request.email,
      request.phone
    );

    // Create the booking
    const bookingBody = {
      idempotency_key: crypto.randomUUID(),
      booking: {
        location_id: this.env.SQUARE_LOCATION_ID,
        customer_id: customerId,
        start_at: request.startAt,
        customer_note: request.customerNote,
        appointment_segments: [
          {
            team_member_id: teamMemberId,
            service_variation_id: service.variationId,
            service_variation_version: service.item.version ?? 0,
          },
        ],
      },
    };

    return this.squareApi.createBooking(bookingBody) as Promise<{ booking: { id: string } }>;
  }

  /**
   * Parse and validate date/time combination
   */
  parseDateTime(date: string, time: string, timezone?: string): string {
    const zone = timezone || this.env.DEFAULT_TIMEZONE || 'America/Edmonton';
    const dateTimeString = `${date} ${time}`;
    const dateTime = DateTime.fromFormat(dateTimeString, 'yyyy-MM-dd HH:mm', { zone });

    if (!dateTime.isValid) {
      throw new Error(`Invalid date/time: ${dateTime.invalidReason}`);
    }

    return dateTime.toISO() || '';
  }

  // Private helper methods

  private async loadServicesByName(includeImages = false) {
    const { objects } = (await this.squareApi.getCatalogObjects()) as { objects: CatalogItem[] };

    const map = new Map<
      string,
      {
        item: CatalogItem;
        variationId: string;
        teamIds: string[];
        pricing_type?: string;
        price_money?: { amount: number; currency: string };
        imageUrl: string;
      }
    >();

    const imageUrlsMap: Record<string, string> = {};

    if (includeImages) {
      await Promise.all(
        objects.map(async obj => {
          const { related_objects } = (await this.squareApi.getCatalogObjectById(obj.id)) as {
            object: Record<string, unknown>;
            related_objects: Array<{ type: string; image_data?: { url?: string } }>;
          };

          const images = related_objects.filter(o => o.type === 'IMAGE');
          const imageUrl = images.length > 0 ? images[0].image_data?.url || '' : '';
          imageUrlsMap[obj.id] = imageUrl;
        })
      );
    }

    for (const obj of objects ?? []) {
      if (obj.type === 'ITEM' && obj.item_data?.product_type === 'APPOINTMENTS_SERVICE') {
        const variation = obj.item_data.variations?.[0];
        const price_money = variation?.item_variation_data?.price_money;
        const pricing_type = variation?.item_variation_data?.pricing_type;
        const variationId = variation?.id;
        const teamIds = variation?.item_variation_data?.team_member_ids;

        if (variationId && teamIds) {
          map.set(obj.item_data.name.toLowerCase(), {
            item: obj,
            variationId,
            price_money,
            imageUrl: imageUrlsMap[obj.id] || '',
            pricing_type,
            teamIds,
          });
        }
      }
    }

    return map;
  }

  private async loadTeamMembersByName() {
    const { team_members } = (await this.squareApi.searchTeamMembers()) as {
      team_members: Array<{ id: string; given_name: string; family_name?: string }>;
    };

    const map = new Map<string, { id: string; given_name: string; family_name?: string }>();

    for (const tm of team_members ?? []) {
      const key = `${tm.given_name} ${tm.family_name ?? ''}`.trim().toLowerCase();
      map.set(key, tm);
    }

    return map;
  }

  private async ensureCustomer(
    firstName: string,
    lastName: string,
    email?: string,
    phone?: string
  ): Promise<string> {
    // Search by email first
    if (email) {
      const { customers } = (await this.squareApi.searchCustomers({
        filter: { email_address: { exact: email } },
      })) as { customers: Array<{ id: string }> };

      if (customers?.length) return customers[0].id;
    }

    // Otherwise create
    const { customer } = (await this.squareApi.createCustomer({
      given_name: firstName,
      family_name: lastName,
      email_address: email,
      phone_number: phone,
    })) as { customer: { id: string } };

    return customer.id;
  }

  private toDayRange(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new HTTPException(400, { message: 'Invalid date format (YYYY-MM-DD)' });
    }
    return {
      start: `${date}T00:00:00-06:00`,
      end: `${date}T23:59:59-06:00`,
    };
  }

  private async checkAvailability(
    variationId: string,
    startAt: string,
    teamMemberId?: string
  ): Promise<boolean> {
    const startDate = new Date(startAt);
    const endDate = new Date(startDate.getTime() + 1 * 3600 * 1000);
    const endDateNonInclusive = new Date(endDate.getTime() - 2 * 60 * 1000);

    const body: BookingBody = {
      query: {
        filter: {
          location_id: this.env.SQUARE_LOCATION_ID,
          start_at_range: { start_at: startDate.toISOString(), end_at: endDate.toISOString() },
          segment_filters: [
            {
              service_variation_id: variationId,
              team_member_id_filter: teamMemberId ? { any: [teamMemberId] } : {},
            },
          ],
        },
      },
    };

    const { availabilities } = (await this.squareApi.searchBookingAvailability(body)) as {
      availabilities: BookingAvailabilies;
    };

    if (!availabilities) return false;

    const availableSlots = availabilities.filter(a => {
      const slotDate = new Date(a.start_at);
      return slotDate.getTime() <= endDateNonInclusive.getTime();
    });

    return availableSlots.length > 0;
  }

  private async findAvailableTeamMember(
    variationId: string,
    startAt: string
  ): Promise<string | null> {
    const availability = await this.checkAvailability(variationId, startAt);
    if (!availability) return null;

    // This is a simplified implementation
    // In a real scenario, you'd want to get the actual available team member ID
    // from the availability response
    return 'default-team-member-id';
  }
}
