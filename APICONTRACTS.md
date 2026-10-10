# Job Application Tracker — API Contracts

**Base URL:** `/api/v1`  
**Format:** JSON  
**Authentication:** JWT stored in an HttpOnly cookie  
**Database:** MongoDB + Mongoose

## 1. API conventions

### Common rules

- All request and response bodies use JSON, except responses with no body.
- Dates use ISO 8601 format in UTC, e.g. `2026-10-10T10:30:00.000Z`.
- Resource IDs are MongoDB ObjectId strings.
- Protected endpoints require a valid authenticated session.
- The backend derives `userId` from the authenticated session, not from request data.
- List endpoints support pagination.
- The server validates all incoming data.

### Standard success response

```json
{
  "success": true,
  "data": {
    "id": "671a12345678901234567890"
  }
}
```

### Standard error response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [
      {
        "field": "company",
        "message": "Company name is required."
      }
    ]
  }
}
```

Common HTTP status codes:

| Code | Meaning                                |
| ---- | -------------------------------------- |
| 200  | Request succeeded                      |
| 201  | Resource created                       |
| 204  | Deleted successfully; no response body |
| 400  | Invalid request or query parameters    |
| 401  | Not authenticated                      |
| 403  | Authenticated but not permitted        |
| 404  | Resource not found                     |
| 409  | Conflict, such as an existing email    |
| 429  | Rate limit exceeded                    |
| 500  | Unexpected server error                |

Never return stack traces, passwords, password hashes, or authentication secrets to the client.

---

## 2. Authentication APIs

### POST `/auth/register`

Create a new account.

**Request**

```json
{
  "name": "Alex",
  "email": "alex@example.com",
  "password": "ExamplePassword123!"
}
```

**Success:** `201 Created`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "671a12345678901234567890",
      "name": "Alex",
      "email": "alex@example.com",
      "createdAt": "2026-10-10T10:30:00.000Z"
    }
  }
}
```

The server hashes the password before storing it. Duplicate email returns `409 EMAIL_ALREADY_EXISTS`.

### POST `/auth/login`

Authenticate an existing user.

**Request**

```json
{
  "email": "alex@example.com",
  "password": "ExamplePassword123!"
}
```

**Success:** `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "671a12345678901234567890",
      "name": "Alex",
      "email": "alex@example.com"
    }
  }
}
```

The response sets an HttpOnly authentication cookie. Do not include the JWT in the JSON response when using cookie-based authentication.

Invalid credentials return `401 INVALID_CREDENTIALS`.

### POST `/auth/logout`

Clear the authentication cookie.

**Success:** `204 No Content`

### GET `/auth/me`

Retrieve the current user.

**Success:** `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "671a12345678901234567890",
      "name": "Alex",
      "email": "alex@example.com"
    }
  }
}
```

---

## 3. Application APIs

### Application data model

```json
{
  "id": "671a12345678901234567891",
  "company": "Acme Technologies",
  "role": "Software Engineer Intern",
  "jobUrl": "https://example.com/jobs/123",
  "location": "Bengaluru",
  "salary": {
    "min": 30000,
    "max": 50000,
    "currency": "INR",
    "period": "MONTHLY"
  },
  "status": "applied",
  "appliedAt": "2026-10-10T10:30:00.000Z",
  "notes": "Applied through the company careers page.",
  "createdAt": "2026-10-10T10:30:00.000Z",
  "updatedAt": "2026-10-10T10:30:00.000Z"
}
```

The `salary` field is optional. Its `period` can be `YEARLY`, `MONTHLY`, or `HOURLY`.

Allowed statuses:

` saved`, `applied`, `online_assessment`, `interview`, `offer`, `rejected`, `withdrawn`

### POST `/applications`

Create a job application.

**Request**

```json
{
  "company": "Acme Technologies",
  "role": "Software Engineer Intern",
  "jobUrl": "https://example.com/jobs/123",
  "location": "Bengaluru",
  "status": "applied",
  "appliedAt": "2026-10-10T10:30:00.000Z",
  "notes": "Applied through the company website."
}
```

**Success:** `201 Created`

Returns the newly created application in `data.application`.

Rules:

- `company` and `role` are required non-empty strings.
- `status` defaults to `saved` when omitted.
- `userId`, `id`, and timestamps are server-managed.
- Reject invalid URLs and unknown status values.

### GET `/applications`

List the current user's applications.

**Query parameters**

| Parameter   | Example     | Purpose                    |
| ----------- | ----------- | -------------------------- |
| `page`      | `1`         | Page number, starting at 1 |
| `limit`     | `10`        | Results per page           |
| `search`    | `acme`      | Search company and role    |
| `status`    | `interview` | Filter by status           |
| `sortBy`    | `updatedAt` | Sort field                 |
| `sortOrder` | `desc`      | `asc` or `desc`            |

Example: `/applications?page=1&limit=10&status=interview&sortBy=updatedAt&sortOrder=desc`

**Success:** `200 OK`

```json
{
  "success": true,
  "data": {
    "applications": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 0,
      "totalPages": 0
    }
  }
}
```

Only return applications owned by the authenticated user. Reject invalid filters, page numbers, or sort fields.

### GET `/applications/:applicationId`

Retrieve one application.

**Success:** `200 OK`

```json
{
  "success": true,
  "data": {
    "application": {}
  }
}
```

The object represents the full application schema above. Return `404 APPLICATION_NOT_FOUND` when the resource does not exist or is not accessible to that user.

### PATCH `/applications/:applicationId`

Update selected fields of an application.

**Request**

```json
{
  "status": "interview",
  "notes": "Technical interview scheduled for Friday."
}
```

**Success:** `200 OK`

```json
{
  "success": true,
  "data": {
    "application": {}
  }
}
```

Only supplied, permitted fields are updated. `userId`, `id`, `createdAt`, and `updatedAt` cannot be assigned by the client.

### DELETE `/applications/:applicationId`  //half update

Delete an application.

**Success:** `204 No Content`

Delete or otherwise consistently handle its associated interview records. Document this behavior in the backend implementation.

---

## 4. Interview APIs

### Interview data model

```json
{
  "id": "671a12345678901234567892",
  "applicationId": "671a12345678901234567891",
  "roundName": "Technical Interview",
  "scheduledAt": "2026-10-15T09:00:00.000Z",
  "meetingUrl": "https://example.com/meeting",
  "result": "pending",
  "notes": "Review data structures and algorithms.",
  "createdAt": "2026-10-10T10:30:00.000Z",
  "updatedAt": "2026-10-10T10:30:00.000Z"
}
```

Allowed results: `pending`, `passed`, `failed`, `cancelled`.

### POST `/applications/:applicationId/interviews`

Create an interview round for an application owned by the current user.

**Request**

```json
{
  "roundName": "Technical Interview",
  "scheduledAt": "2026-10-15T09:00:00.000Z",
  "meetingUrl": "https://example.com/meeting",
  "notes": "Review data structures and algorithms."
}
```

**Success:** `201 Created`

```json
{
  "success": true,
  "data": {
    "interview": {}
  }
}
```

`applicationId`, ownership, IDs, and timestamps are managed by the server. `result` defaults to `pending`.

### GET `/applications/:applicationId/interviews`

List the interview rounds for an application.

**Success:** `200 OK`

```json
{
  "success": true,
  "data": {
    "interviews": []
  }
}
```

### PATCH `/interviews/:interviewId`

Update a scheduled interview, meeting URL, notes, or result.

**Request**

```json
{
  "scheduledAt": "2026-10-16T09:00:00.000Z",
  "result": "passed"
}
```

**Success:** `200 OK`

```json
{
  "success": true,
  "data": {
    "interview": {}
  }
}
```

### DELETE `/interviews/:interviewId`

Delete an interview round.

**Success:** `204 No Content`

All interview operations must verify ownership through the associated application or an equivalent reliable ownership check.

---

## 5. Dashboard API

### GET `/dashboard/summary`

Return statistics for the authenticated user's applications.

**Success:** `200 OK`

```json
{
  "success": true,
  "data": {
    "totalApplications": 25,
    "statusCounts": {
      "saved": 3,
      "applied": 10,
      "online_assessment": 4,
      "interview": 5,
      "offer": 1,
      "rejected": 2,
      "withdrawn": 0
    },
    "upcomingInterviews": [
      {
        "id": "671a12345678901234567892",
        "applicationId": "671a12345678901234567891",
        "company": "Acme Technologies",
        "role": "Software Engineer Intern",
        "roundName": "Technical Interview",
        "scheduledAt": "2026-10-15T09:00:00.000Z"
      }
    ]
  }
}
```

Counts must be calculated from database records belonging to the authenticated user. Upcoming interviews should include only future interviews with a `pending` result, sorted by earliest scheduled time.

---

## 6. Contract rules for implementation

1. **Authentication:** apply authentication middleware to all application, interview, and dashboard endpoints.
2. **Ownership:** never fetch or modify a private resource solely by its ID; verify the current user's access.
3. **Validation:** validate request bodies and query parameters on the server.
4. **Error handling:** use one consistent error response format across all endpoints.
5. **Pagination:** set a maximum page size, such as 100.
6. **Security:** hash passwords, rate-limit login attempts, restrict CORS, and configure secure cookies and CSRF protection as appropriate.
7. **Testing:** test successful requests, invalid input, missing authentication, nonexistent resources, and attempts to access another user's data.
8. **Consistency:** document the exact behavior of application deletion, status changes, cookie expiration, and date validation before deployment.

**Implementation order:** register/login → create application → list applications → update/delete → interview APIs → dashboard summary → security and integration tests.
