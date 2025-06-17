# Square Booking API Documentation

## Overview

The Square Booking API is a RESTful API that provides appointment booking functionality backed by Square's booking system. All endpoints return JSON responses with a consistent structure.

## Base URL

```
https://your-worker.your-subdomain.workers.dev
```

## Authentication

All endpoints except `/health` require a Bearer token in the Authorization header:

```
Authorization: Bearer your_auth_token
```

## Response Format

All API responses follow this structure:

### Success Response

```json
{
  "success": true,
  "data": {
    /* response data */
  },
  "count": 0, // optional: number of items
  "message": "optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {
      /* optional error details */
    }
  },
  "timestamp": "2024-02-15T10:30:00.000Z"
}
```

## Endpoints

### Health Check

Check API health and status.

**Endpoint:** `GET /health`
**Authentication:** None required

#### Response

```json
{
  "status": "ok",
  "timestamp": "2024-02-15T10:30:00.000Z",
  "environment": "development"
}
```

---

### Get Services

Retrieve all available appointment services with full details.

**Endpoint:** `GET /services`
**Authentication:** Bearer token required

#### Response

```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": "catalog-item-id",
        "service_variation_id": "variation-id",
        "name": "Haircut",
        "pricing_type": "FIXED_PRICING",
        "pricing_currency": "USD",
        "pricing_amount": 25.0,
        "description": "Professional haircut service",
        "imageUrl": "https://example.com/image.jpg",
        "providers": [
          {
            "id": "team-member-id",
            "name": "John Doe"
          }
        ]
      }
    ]
  },
  "count": 1
}
```

---

### Get Service Names

Retrieve only the names of available services.

**Endpoint:** `GET /services/names`
**Authentication:** Bearer token required

#### Response

```json
{
  "success": true,
  "data": {
    "services": ["Haircut", "Beard Trim", "Hair Wash"]
  },
  "count": 3
}
```

---

### Get Team Members

Retrieve all staff members who can provide services.

**Endpoint:** `GET /team-members`
**Authentication:** Bearer token required

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "team-member-id",
      "name": "John Doe"
    },
    {
      "id": "team-member-id-2",
      "name": "Jane Smith"
    }
  ],
  "count": 2
}
```

---

### Check Availability

Get available appointment slots for a specific service on a specific date.

**Endpoint:** `GET /availability`
**Authentication:** Bearer token required

#### Query Parameters

- `date` (required): Date in YYYY-MM-DD format
- `serviceName` (required): Name of the service

#### Example Request

```
GET /availability?date=2024-02-15&serviceName=Haircut
```

#### Response

```json
{
  "success": true,
  "data": [
    {
      "start_at": "2024-02-15T09:00:00-07:00",
      "appointment_segments": [
        {
          "duration_minutes": 60,
          "service_variation_id": "variation-id",
          "team_member_id": "team-member-id"
        }
      ]
    }
  ],
  "count": 1
}
```

---

### Get Availability Times

Get available appointment times grouped by time periods (morning, afternoon, night).

**Endpoint:** `GET /availability-times`
**Authentication:** Bearer token required

#### Query Parameters

- `date` (required): Date in YYYY-MM-DD format
- `serviceName` (required): Name of the service
- `timezone` (optional): Timezone (default: America/Edmonton)

#### Example Request

```
GET /availability-times?date=2024-02-15&serviceName=Haircut&timezone=America/Edmonton
```

#### Response

```json
{
  "success": true,
  "data": {
    "result": [
      {
        "category": "morning",
        "times": ["09:00", "10:00", "11:00"]
      },
      {
        "category": "afternoon",
        "times": ["13:00", "14:00", "15:00"]
      },
      {
        "category": "night",
        "times": ["18:00", "19:00"]
      }
    ]
  }
}
```

---

### Bulk Availability Check

Get available appointment times in a different format for bulk processing.

**Endpoint:** `POST /availability-array`
**Authentication:** Bearer token required

#### Request Body

```json
{
  "date": "2024-02-15",
  "serviceName": "Haircut",
  "timezone": "America/Edmonton"
}
```

#### Response

```json
{
  "success": true,
  "data": ["2024-02-15, 9:00:00 a.m.", "2024-02-15, 10:00:00 a.m.", "2024-02-15, 1:00:00 p.m."],
  "count": 3
}
```

---

### Parse Date Time

Parse and validate a date/time combination.

**Endpoint:** `POST /parse_date_time`
**Authentication:** Bearer token required
**Content-Type:** `application/x-www-form-urlencoded`

#### Request Body (Form Data)

- `date`: Date in YYYY-MM-DD format
- `time`: Time in HH:MM format
- `timezone` (optional): Timezone (default: America/Edmonton)

#### Example Request

```
POST /parse_date_time
Content-Type: application/x-www-form-urlencoded

date=2024-02-15&time=14:00&timezone=America/Edmonton
```

#### Response

```json
{
  "success": true,
  "data": {
    "isoDate": {
      "year": 2024,
      "month": 2,
      "day": 15,
      "hour": 14,
      "minute": 0,
      "zone": "America/Edmonton",
      "isValid": true
    }
  }
}
```

---

### Create Appointment

Create a new appointment booking.

**Endpoint:** `POST /appointment`
**Authentication:** Bearer token required

#### Request Body

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "serviceName": "Haircut",
  "startAt": "2024-02-15T14:00:00-07:00",
  "teamMemberName": "Jane Smith",
  "customerNote": "First time customer"
}
```

#### Field Descriptions

- `firstName` (required): Customer's first name
- `lastName` (required): Customer's last name
- `email` (optional): Customer's email address
- `phone` (optional): Customer's phone number
- `serviceName` (required): Name of the requested service
- `startAt` (required): Appointment start time in RFC-3339 format
- `teamMemberName` (optional): Specific staff member (auto-assigned if not provided)
- `customerNote` (optional): Special instructions or notes

#### Response

```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "booking-id-123"
    }
  },
  "message": "Booking created successfully"
}
```

## Error Codes

| Code               | HTTP Status | Description                                |
| ------------------ | ----------- | ------------------------------------------ |
| `HTTP_401`         | 401         | Authentication required or invalid token   |
| `HTTP_400`         | 400         | Invalid request data or missing parameters |
| `HTTP_404`         | 404         | Requested resource not found               |
| `HTTP_409`         | 409         | Conflict (e.g., time slot unavailable)     |
| `VALIDATION_ERROR` | 400         | Input validation failed                    |
| `INTERNAL_ERROR`   | 500         | Server error                               |

## Rate Limiting

Currently no rate limiting is implemented, but it's recommended to:

- Limit booking creation to prevent spam
- Cache service and team member data when possible
- Use availability endpoints efficiently

## Examples

### Complete Booking Flow

1. **Get available services**

   ```bash
   curl -H "Authorization: Bearer token" \
     https://api.example.com/services/names
   ```

2. **Check availability**

   ```bash
   curl -H "Authorization: Bearer token" \
     "https://api.example.com/availability?date=2024-02-15&serviceName=Haircut"
   ```

3. **Create booking**
   ```bash
   curl -X POST \
     -H "Authorization: Bearer token" \
     -H "Content-Type: application/json" \
     -d '{"firstName":"John","lastName":"Doe","serviceName":"Haircut","startAt":"2024-02-15T14:00:00-07:00"}' \
     https://api.example.com/appointment
   ```

### Error Handling

Always check the `success` field in responses:

```javascript
const response = await fetch('/services', {
  headers: { Authorization: 'Bearer your-token' },
});
const data = await response.json();

if (data.success) {
  // Handle successful response
  console.log(data.data);
} else {
  // Handle error
  console.error(data.error.message);
}
```
