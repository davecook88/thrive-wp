# Platform Architecture & Engineering Guide

# Platform Architecture & Engineering Guide

This document is the canonical reference for the hybrid WordPress + NestJS platform. It summarizes runtime contracts, deployment expectations, auth flows, database patterns, and links to operational guidance and deeper design notes located in the `docs/` folder and the `.github/instructions/` directory.

---
## 1. Core Services & Deployment Model

Services

- Nginx (web) — unified reverse proxy + header injection; dev endpoint: `http://localhost:8080`.
- WordPress — presentation + CMS authoring (proxied behind Nginx).
- NestJS API — business logic & auth authority; dev endpoint: `http://localhost:3000`.
- MariaDB — persistent data store (internal 3306).

All services are intended to run on a single VPS in Docker. Use `make run` or `docker-compose up --build` to start the environment.

File layout (simplified)

```
docker-compose.yml
nestjs/
wordpress/
nginx/
docs/
.github/instructions/
```

---
## 2. Authentication & Introspection (summary)

- Supports Email/Password and Google OAuth.
- NestJS issues a signed session cookie (default name `thrive_sess`).
- Nginx performs an internal subrequest to `/auth/introspect` when `thrive_sess` is present and injects `X-Auth-*` headers into incoming requests forwarded to WordPress.
- WordPress PHP code parses `X-Auth-Context` into a typed `ThriveAuthContext` object; helpers such as `thrive_is_logged_in()`, `thrive_get_auth_context()` and role helpers are provided.
- Manual wp-login flows: `thrive_hydrate_user_from_proxy()` now skips hydration entirely when WordPress forces `reauth=1` or processes a POST to `wp-login.php`. This leaves the native login form fully in control while the rest of the site continues to hydrate users via headers. After a successful manual login, a `login_redirect` filter forces navigation to `/wp-admin/` so the very next request re-enters the hydrated state.

Environment variables used by auth flows: `SESSION_SECRET`, `SESSION_COOKIE_NAME`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, and `WP_BASE_URL`.

---
## 3. Runtime Contracts & Helpers (quick)

- Use `http://nestjs:3000/` for internal service-to-service calls from WordPress (inside Docker).
- Client-side fetches may use proxied `/api/` routes so browser sends the cookie automatically.

Common PHP helpers (available in the WP plugin/theme):

- `thrive_get_auth_context()` — typed object or null.
- `thrive_is_logged_in()` — boolean.
- `thrive_user_has_role($role)` — role check.
- `thrive_is_admin()`, `thrive_is_teacher()` — convenience checks.

Quick snippets

PHP login check

```php
if (thrive_is_logged_in()) { /* ... */ }
```

Server-side API health check from WP

```php
$resp = wp_remote_get('http://nestjs:3000/health');
```

Client JS POST (same origin / proxied)

```js
fetch('/api/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
```

---
## 4. Database & Schema Notes

- Core tables: `user`, `admin`, `teacher`, `teacher_availability`, and related scheduling tables. (Note: schemas and migrations live in `nestjs/src/migrations`.)
- Use TypeORM migrations for schema changes. Follow idempotent migration patterns.
- Role detection is implemented as a single UNION query for performance.

### Timezone Handling (UTC Convention)

**All session times are stored in UTC in the database.** Client applications are responsible for displaying times in the user's local timezone.

- **Database Layer**: All `datetime` columns (e.g., `session.startAt`, `session.endAt`, `course_cohort.enrollmentDeadline`) store times in UTC.
- **API Responses**: Times are serialized as ISO 8601 strings (e.g., `"2025-01-15T14:30:00Z"`), always in UTC.
- **Client Layer**: The frontend JavaScript/Vue code must convert UTC times to the user's local timezone for display. Use standard browser APIs (`Intl`, `toLocaleString()`) or libraries like `Day.js` with timezone support.
- **No Course-Level Timezone Configuration**: There is no course-level or cohort-level timezone field. All scheduling uses a single UTC reference.

This approach ensures consistency across regions and simplifies scheduling logic, while allowing flexible, client-side presentation.

---
## 5. Development Workflow & Commands

- Start the full stack: `make run` or `docker-compose up --build`.
- View logs:
    - Nginx: `docker-compose logs -f web`
    - WordPress: `docker-compose logs -f wordpress`
    - NestJS: `docker-compose logs -f nestjs`

Plugin/theme development: files under `wordpress/plugins/` and `wordpress/themes/custom-theme/` are mounted as volumes and change immediately in the container.

NestJS dev: `pnpm run start:dev` (inside the Nest container) for hot reload if configured.

### 5.1 Running Playwright E2E Tests

To run specific Playwright End-to-End tests, use the following command. The `--reporter list` flag provides a concise, real-time summary of test execution in the console.

```bash
pnpm exec playwright test <path/to/test-file.spec.ts> --reporter list
```

Example:
```bash
pnpm exec playwright test tests/e2e/admin-curriculum-builder.spec.ts --reporter list
```

---
## 6. Related design docs (in `docs/`)

The repository contains additional, focused design notes and plans. Refer to these files for deeper implementation details:

- `docs/gutenberg-calendar-block.md` — design and implementation notes for the calendar Gutenberg block.
- `docs/reusable-calendar-plan.md` — plan for reusability and data flow of calendar components.
- `docs/teachers-section-plan.md` — UX and data model for the teachers admin section.
- `docs/thrive-modal-architecture.md` — modal design used by block editor and runtime (referenced by block implementations).
- `docs/ai-test-accounts.md` — details on stable test accounts for AI agents and automation.

When updating blocks, update the relevant doc in `docs/` and update this file if the runtime contract changes.

---
## 7. Authoritative instruction files

Operational and architecture guidance is maintained under `.github/instructions/`. Keep these files in sync with `CLAUDE.md`.

- `.github/instructions/nestjs.instructions.md` — NestJS architecture, patterns, and deployment notes.
- `.github/instructions/nginx.instructions.md` — Nginx/reverse proxy responsibilities and configuration guidance.
- `.github/instructions/theme.instructions.md` — WordPress theme conventions and block development pattern.
- `.github/instructions/thrive-admin-plugin.instructions.md` — Plugin-level patterns for `thrive-admin` and bridge plugins.
- `.github/instructions/wordpress.instructions.md` — WordPress layer conventions and runtime guidance.

These files are referenced from the Copilot instruction set for contributors and CI checks. If the behavior or guarantees described here diverge from those instruction files, update them accordingly or mark the authoritative source.

---
## 8. Quality Gates & Checklist

Before merging changes that affect runtime contracts or DB schema, ensure:

1. PHP static analysis (phpstan) passes.
2. TypeScript builds and tests pass for NestJS and web components.
3. Relevant TypeORM migrations are included and tested.
4. Update `GEMINI.md` and the related `.github/instructions/*` file(s) if the contract changes.

---
## 9. Roadmap (short)

1. Refresh token rotation & silent renew.
2. Fine-grained permissions service.
3. Payments integration (Stripe).

Maintainers: Keep this file the canonical truth; when adding features or changing runtime contracts, update `docs/` and the appropriate files in `.github/instructions/` to keep contributors aligned.


--
## 10. Typing & API Client

`any` types are strictly forbidden.

**ThriveClient**: The authoritative API client is located at `apps/wordpress/shared/thrive.ts`. This is the single source of truth for all browser-side API interactions. All blocks and components MUST use this client for API calls.

All API types MUST be declared in the shared package (`@thrive/shared`) - this should cover most types used in the client side code. There should be minimal type declarations in the client side apps. Use API types where possible.