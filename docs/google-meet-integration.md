# Google Meet Integration Plan

## Implementation Status

**IMPLEMENTED** - The core Google Meet integration has been implemented with the following components:

### Completed Components
- ✅ DB migrations for `teacher_google_credential` and `session_meet_event` tables
- ✅ `GoogleAuthService` - OAuth flow, token exchange, encryption, refresh
- ✅ `MeetingService` - Google Calendar API calls for Meet creation/update/delete  
- ✅ `EncryptionService` - AES-256-GCM encryption for OAuth tokens
- ✅ Event-driven architecture using `@nestjs/event-emitter`
- ✅ `MeetEventListener` - handles session lifecycle events
- ✅ Session scheduled/canceled event emission in BookingsService
- ✅ Shared types in `@thrive/shared` package
- ✅ REST API endpoints for OAuth and Meet management

### API Endpoints
- `GET /api/google/oauth/start?teacherId=:id` - Initiate OAuth flow (teacher/admin only)
- `GET /api/google/oauth/callback` - OAuth callback handler
- `GET /api/google/status/:teacherId` - Get connection status
- `POST /api/google/disconnect/:teacherId` - Revoke credentials
- `POST /api/google/meet/retry/:sessionId` - Retry Meet creation (admin only)
- `GET /api/google/meet/:sessionId` - Get Meet info for a session

### Environment Variables
```bash
# Uses existing Google OAuth credentials (same as login)
# GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are already configured

# Required for token encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
GOOGLE_ENCRYPTION_KEY=64-character-hex-key-for-token-encryption
```

### Google Cloud Console Setup
1. Enable the Google Calendar API in your project
2. Add the `https://www.googleapis.com/auth/calendar.events` scope to your OAuth consent screen
3. Add `${WP_BASE_URL}/api/google/oauth/callback` to authorized redirect URIs

---

## Goals
- Each scheduled session (private, group, course) automatically receives a Google Meet meeting link.
- Meet lifecycle (create, update, cancel) stays in NestJS so WordPress continues as presentation only.
- Teacher authorizes once; links populate everywhere a session is shown.

## Google API + OAuth
1. Register a Google Cloud project with Calendar API enabled and a web OAuth client.
2. The integration reuses existing OAuth credentials:
  - `GOOGLE_CLIENT_ID` - Already configured for login
  - `GOOGLE_CLIENT_SECRET` - Already configured for login
  - Redirect URI derived from `WP_BASE_URL` + `/api/google/oauth/callback`
  - `GOOGLE_ENCRYPTION_KEY` - New, for token encryption at rest
  > Service accounts are insufficient here because Meet links must live on each teacher's personal calendar, which requires user-consented OAuth tokens. A service account could only manage calendars it owns or that are explicitly shared, which does not reflect our per-teacher workflow.
3. NestJS exposes `/google/oauth/start` -> `/google/oauth/callback`:
   - Start endpoint builds Google consent URL with `https://www.googleapis.com/auth/calendar.events` scope and teacher context.
   - Callback validates state, exchanges `code` for tokens, encrypts & stores `{ accessToken, refreshToken, expiry, scope, calendarId }` in `teacher_google_credentials` table keyed to teacher.
   - Refresh service periodically renews access tokens; failures flip a `token_status` flag.

## Data Model Changes
- New table `teacher_google_credentials`:
  - `id`, `teacher_id` FK, `calendar_id`, `access_token_enc`, `refresh_token_enc`, `expires_at`, `token_status`, `updated_at`.
- New table `class_meet_events`:
  - `id`, `session_id` FK, `google_event_id`, `hangout_link`, `conference_data_version`, `status`, `last_error`, timestamps.
- Extend shared DTOs (`packages/shared`) so class/session payloads include:
  - `meetLink: string | null`
  - `meetEventId: string | null`
  - `meetStatus: 'PENDING' | 'READY' | 'ERROR'`

## NestJS Components
- `GoogleAuthService`: handles OAuth redirects, token exchange, encryption, refresh.
- `MeetingService`: orchestrates Google Calendar calls (`events.insert`, `events.patch`, `events.delete`) with `conferenceData.createRequest` to generate Meet URLs.
- `SessionEvents` pipeline:
  1. When a booking/reschedule/cancel occurs, domain events (`SessionScheduledEvent`, `SessionRescheduledEvent`, `SessionCanceledEvent`) emit.
  2. Bull queue worker consumes events so Meet logic never blocks HTTP responses.
  3. Worker loads teacher creds, refreshes tokens if needed, and calls Google API.
  4. Results persisted to `class_meet_events` and surfaced to clients via session DTOs.
- Failure handling: retries with exponential backoff, marks `meetStatus=ERROR`, notifies ops (log + optional Slack/webhook).

## WordPress / Frontend Changes
- Update shared API client to read new Meet fields from session endpoints.
- Teacher/student dashboards display Meet link when available; show "Link pending" or manual entry fallback when status is `PENDING`/`ERROR`.
- Admin UI gains:
  - Google Connect button (launches NestJS OAuth start route).
  - Token status indicator per teacher.
  - Manual "Retry Meet Creation" action that hits NestJS `/sessions/:id/meet/retry`.

## Lifecycle Scenarios
- **Create session**: enqueue job -> create Meet -> store `hangoutLink` -> return via API.
- **Reschedule**: update local session, enqueue job -> call `events.patch` -> update record.
- **Cancel**: enqueue job -> call `events.delete` -> mark `meetStatus=CANCELED`.
- **Token missing/expired**: block meet creation, respond with actionable error so admin can prompt teacher to reconnect.

## Ops & Testing
- Update `.env.example`, docker-compose, and deployment docs with new secrets.
- Provide script to seed Google credentials in non-prod (service user or fake adapter) for automated tests.
- Unit tests around `GoogleAuthService` (token exchange, encryption) and `MeetingService` using mocked Google API.
- Integration tests for booking flow verifying meet job enqueued + DTO includes `meetLink`.
- Observability: metrics for job success/failure counts, token refresh failures, Google API latency.

## Rollout Steps
1. Land DB migrations + shared types.
2. Implement OAuth + credential storage.
3. Build queue worker + MeetingService.
4. Wire booking flows to emit events and expose meet data.
5. Update WordPress theme/admin UI.
6. Document support runbooks and add monitoring alerts for meet failures.
