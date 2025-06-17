import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Environment, Config } from '../config/environment';

export interface SquareApiResponse<T = unknown> {
  errors?: Array<{ detail: string; category?: string; code?: string }>;
  data?: T;
}

export class SquareApiService {
  constructor(
    private env: Environment,
    private config: Config
  ) {}

  /**
   * Generic method to make Square API calls
   */
  async fetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.config.api.baseUrl}${path}`;

    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'Square-Version': this.env.SQUARE_API_VERSION,
        Authorization: `Bearer ${this.env.SQUARE_ACCESS_TOKEN}`,
        ...init.headers,
      },
    });

    const payload = (await response.json()) as SquareApiResponse<T> & T;

    if (!response.ok) {
      const status = response.status as ContentfulStatusCode;
      const errorMessage =
        payload.errors?.map(e => e.detail).join('; ') ?? `Square API request failed: ${path}`;

      throw new HTTPException(status, { message: errorMessage });
    }

    return payload;
  }

  /**
   * Get catalog objects (services)
   */
  async getCatalogObjects(types = 'ITEM', productTypes = 'APPOINTMENTS_SERVICE') {
    return this.fetch(`/catalog/list?types=${types}&product_types=${productTypes}`);
  }

  /**
   * Get catalog object by ID with related objects
   */
  async getCatalogObjectById(id: string, includeRelated = true) {
    const params = new URLSearchParams({
      include_related_objects: includeRelated.toString(),
      include_category_path_to_root: 'false',
    });
    return this.fetch(`/catalog/object/${id}?${params}`);
  }

  /**
   * Search team members
   */
  async searchTeamMembers(query = {}) {
    return this.fetch('/team-members/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  /**
   * Search customers
   */
  async searchCustomers(query: object) {
    return this.fetch('/customers/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  /**
   * Create customer
   */
  async createCustomer(customerData: object) {
    return this.fetch('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  }

  /**
   * Search booking availability
   */
  async searchBookingAvailability(query: object) {
    return this.fetch('/bookings/availability/search', {
      method: 'POST',
      body: JSON.stringify(query),
    });
  }

  /**
   * Create booking
   */
  async createBooking(bookingData: object) {
    return this.fetch('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }
}
