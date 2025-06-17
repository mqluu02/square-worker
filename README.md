# Square Booking API

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Hono](https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white)](https://hono.dev/)

A professional, modular booking API gateway that interfaces with Square's appointment booking system. Built with Cloudflare Workers, Hono, and TypeScript for high performance and developer experience.

## Features

- **High Performance**: Built on Cloudflare Workers for global edge deployment
- **Modular Architecture**: Clean separation of concerns with services, middleware, and utilities
- **Security First**: Bearer token authentication and input validation
- **Type Safety**: Full TypeScript support with strict mode enabled
- **Well Tested**: Comprehensive test suite with Vitest
- **Well Documented**: Complete API documentation and examples
- **Developer Tools**: ESLint, Prettier, Husky pre-commit hooks

## Tech Stack

- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **Framework**: [Hono](https://hono.dev/) - Lightweight web framework
- **Language**: [TypeScript](https://www.typescriptlang.org/) with strict mode
- **Validation**: [Zod](https://github.com/colinhacks/zod) for schema validation
- **Date/Time**: [Luxon](https://moment.github.io/luxon/) for timezone handling
- **Testing**: [Vitest](https://vitest.dev/) with Cloudflare Workers testing

## API Endpoints

### Public Endpoints

- `GET /health` - Health check and system status

### Authenticated Endpoints (Bearer Token Required)

- `GET /services` - List all appointment services with details
- `GET /services/names` - Get service names only
- `GET /team-members` - List all team members/staff
- `GET /availability` - Check availability for specific date/service
- `GET /availability-times` - Get available times grouped by time periods
- `POST /availability-array` - Bulk availability checking
- `POST /appointment` - Create new appointment booking
- `POST /parse_date_time` - Parse and validate date/time strings

## Quick Start

### Prerequisites

- Node.js 18+ and npm/pnpm
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- Square Developer Account with Sandbox/Production access

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd square-booking-api
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure environment variables**

   ```bash
   cp env.example .dev.vars
   # Edit .dev.vars with your actual values
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Environment Variables

Copy `env.example` to `.dev.vars` and configure:

```bash
# Square API Configuration
SQUARE_ACCESS_TOKEN=your_square_access_token_here
SQUARE_API_VERSION=2025-04-16
SQUARE_LOCATION_ID=your_square_location_id_here

# API Authentication
AUTH_TOKEN=your_secure_auth_token_here

# Application Configuration
ENVIRONMENT=development
DEFAULT_TIMEZONE=America/Edmonton
```

## Usage Examples

### Authentication

All API endpoints (except `/health`) require a Bearer token:

```bash
curl -H "Authorization: Bearer your_auth_token" \
  https://your-worker.your-subdomain.workers.dev/services
```

### Get Available Services

```bash
curl -H "Authorization: Bearer your_auth_token" \
  https://your-worker.your-subdomain.workers.dev/services
```

```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": "service-id",
        "service_variation_id": "variation-id",
        "name": "Haircut",
        "pricing_amount": 25.0,
        "pricing_currency": "USD",
        "description": "Professional haircut service",
        "providers": [{ "id": "staff-id", "name": "John Doe" }]
      }
    ]
  },
  "count": 1
}
```

### Check Availability

```bash
curl -H "Authorization: Bearer your_auth_token" \
  "https://your-worker.your-subdomain.workers.dev/availability?date=2024-02-15&serviceName=Haircut"
```

### Create Appointment

```bash
curl -X POST \
  -H "Authorization: Bearer your_auth_token" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "serviceName": "Haircut",
    "startAt": "2024-02-15T14:00:00-07:00",
    "customerNote": "First time customer"
  }' \
  https://your-worker.your-subdomain.workers.dev/appointment
```

## Project Structure

```
src/
├── config/
│   └── environment.ts     # Environment validation and configuration
├── middleware/
│   ├── auth.ts           # Authentication middleware
│   └── error-handler.ts  # Global error handling
├── services/
│   ├── square-api.ts     # Square API service abstraction
│   └── booking-service.ts # Business logic for bookings
├── schemas/
│   └── validation.ts     # Zod validation schemas
├── types/
│   ├── Booking.ts        # Booking type definitions
│   ├── CatalogItem.ts    # Catalog item types
│   └── ...              # Other type definitions
├── utils/
│   └── time-utils.ts     # Time/timezone utilities
└── index.ts             # Main application entry point
```

## Testing

Run the test suite:

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Development

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run type-check

# Build (runs type-check, lint, and test)
npm run build
```

### Pre-commit Hooks

The project uses Husky for pre-commit hooks that automatically:

- Run ESLint and fix issues
- Format code with Prettier
- Run type checking

## Deployment

### Development

```bash
npm run dev
```

### Production

1. **Set production secrets** (recommended):

   ```bash
   wrangler secret put SQUARE_ACCESS_TOKEN
   wrangler secret put AUTH_TOKEN
   ```

2. **Deploy**:
   ```bash
   npm run deploy
   ```

### Environment-specific Deployment

Update `wrangler.jsonc` for different environments:

```jsonc
{
  "name": "square-booking-api-prod",
  "vars": {
    "ENVIRONMENT": "production",
    "SQUARE_API_VERSION": "2025-04-16",
  },
}
```

## API Documentation

For detailed API documentation with request/response examples, see [docs/api.md](docs/api.md).

## Security

- **Authentication**: Bearer token required for all endpoints except `/health`
- **Input Validation**: All inputs validated with Zod schemas
- **Error Handling**: Consistent error responses without sensitive data leaks
- **Secrets Management**: Use Wrangler secrets for production deployment

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm run build`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Square Developer Platform](https://developer.squareup.com/) for the booking API
- [Cloudflare Workers](https://workers.cloudflare.com/) for edge computing platform
- [Hono](https://hono.dev/) for the lightweight web framework
