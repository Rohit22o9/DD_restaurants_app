# Daily Drop Restaurant Partner API Documentation

## Base URL
```
http://localhost:4000/api/v1
```

## Security & Authentication
All endpoints except `/auth/login`, `/auth/accept-invitation`, `/auth/forgot-password`, and `/api/health` require a Bearer token in the `Authorization` header:
```http
Authorization: Bearer <jwt_token>
```

---

## 1. Authentication Endpoints

### `POST /auth/login`
Authenticates an administrator or restaurant partner.
- **Request Body**:
  ```json
  {
    "email": "admin@dailydrop.com",
    "password": "DailyDropAdmin2026!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "user": {
      "id": "dd-admin-001",
      "email": "admin@dailydrop.com",
      "name": "Daily Drop Head of Ops",
      "role": "admin",
      "status": "active"
    },
    "restaurant": null
  }
  ```

### `GET /auth/me`
Retrieves the current authenticated user and linked restaurant (if partner).

### `POST /auth/accept-invitation`
Single-use token endpoint for onboarding invited restaurant owners.
- **Request Body**:
  ```json
  {
    "token": "xeela-invite-demo-2026",
    "name": "Tenzin Dorjee",
    "password": "NewSecurePassword2026!"
  }
  ```

### `POST /auth/change-password`
Changes account password for authenticated user.

---

## 2. Administrator Endpoints (`role: admin`)

### `GET /admin/dashboard/metrics`
Calculates and returns live operational KPIs:
- `totalRestaurants`: total registered count
- `activePartners`: count of active kitchens
- `updatesPublished`: count of published briefings
- `updatesAwaitingResponses`: recipient records pending action
- `urgentOrOverdueResponses`: count of urgent/overdue responses
- `recentActivity`: stream of latest kitchen response submissions
- `recentUpdates`: latest updates with response progress percentages

### `GET /admin/restaurants`
Query params: `search`, `status` (`active`, `pending_invitation`, `suspended`).
Returns restaurant partners with `pendingUpdateCount` and `lastActivity`.

### `POST /admin/restaurants`
Creates a new restaurant partner. Optionally generates an invitation link and sends an invitation email.

### `PUT /admin/restaurants/:id`
Updates restaurant details (name, owner, phone, address, notes).

### `POST /admin/restaurants/:id/invite`
Generates and dispatches a 48-hour single-use invitation token.

### `PATCH /admin/restaurants/:id/status`
Suspends or reactivates a restaurant account.

### `GET /admin/updates`
Query params: `status`, `priority`, `category`, `search`.
Lists all updates with recipient delivery and response progress metrics.

### `POST /admin/updates`
Creates an operational update:
- `title`: string
- `category`: one of 12 Daily Drop categories
- `priority`: `normal` | `important` | `high` | `urgent`
- `message`: instructions in markdown
- `responseType`: `acknowledgement_only` | `availability_confirmation` | `multiple_choice` | `info_request` | `announcement_only`
- `responseConfig`: choices or question configuration
- `targetType`: `all` | `selected`
- `targetRestaurantIds`: array of restaurant IDs if selected
- `deadlineAt`: ISO timestamp
- `scheduledAt`: ISO timestamp (if scheduling)
- `publishNow`: boolean

### `POST /admin/updates/:id/attachments`
Uploads up to 10 files (PDF, XLSX, CSV, DOCX, PNG, JPG up to 25MB).

### `GET /admin/updates/:id`
Returns update details, attachment records, and full recipient response tracking matrix.

### `POST /admin/updates/:id/publish`
Broadcasts a draft or scheduled update immediately to all targeted partners.

### `PATCH /admin/updates/:id/responses/:responseId/review`
Records an administrator follow-up note and marks the response status as `reviewed`.

---

## 3. Restaurant Partner Endpoints (`role: restaurant_partner`)

*All restaurant endpoints enforce strict tenant data isolation. Partners can never query or view another restaurant's assignments or responses.*

### `GET /restaurant/dashboard`
Returns:
- Restaurant greeting and profile code
- Unread notification count
- Counters: `awaitingResponse`, `newCount`, `recentlyCompleted`
- Urgent updates list
- Recent updates feed

### `GET /restaurant/updates`
Filterable updates feed:
- `filter`: `all` | `unread` | `urgent` | `awaiting_response` | `acknowledged` | `completed` | `overdue`
- `sort`: `newest` | `oldest` | `priority` | `deadline`
- `search`: title or content keyword

### `GET /restaurant/updates/:id`
Retrieves update details and automatically transitions recipient status from `delivered` to `read` (recording `read_at` timestamp).

### `GET /restaurant/updates/:id/attachments/:attachmentId/download`
Authorized streaming of private attachments. Verifies that the restaurant was targeted with this update before serving file bytes.

### `POST /restaurant/updates/:id/acknowledge`
Records restaurant acknowledgement receipt.

### `POST /restaurant/updates/:id/response`
Submits availability confirmation, constraints, or multiple choice answers:
```json
{
  "availabilityStatus": "available",
  "availabilityDetails": {
    "maxCapacity": 120
  },
  "answerText": "Kitchen ready for Monday lunch batch.",
  "isDraft": false
}
```

### `GET /restaurant/responses`
Historical list of all responses submitted by this restaurant with operations feedback notes.

### `GET /restaurant/notifications`
In-app notification center for new briefs, urgent warnings, and deadline reminders.

### `PATCH /restaurant/notifications/:id/read`
Marks single notification as read.

### `PATCH /restaurant/notifications/mark-all-read`
Marks all notifications as read.
