# Platform Architecture & Engineering Guide

This document unifies all operational#### Business Domain Highlights
* **User Management**: `user` table with email/password + Google OAuth
* **Admin System**: `admin` table with role-based access control
* **Teacher Management**: `teac### Glossary
| T### Quick Reference Snippets

Check login in PHP:
```php
if ( thrive_is_logged_in() ) { /* ... */ }
```

Role-based checks:
```php
if (thrive_is_admin()) {
    // Show admin features
}
if (thrive_is_teacher()) {
    // Show teacher features  
}
if (thrive_user_has_role(ThriveRole::ADMIN)) {
    // Alternative syntax
}
```

Fetch API from WP (server-side):
```php
$resp = wp_remote_get('http://nestjs:3000/health');
```

Client JS POST (cookie auto-sent):
```js
fetch('/api/classes', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({})});
``` |
|------|------------|
| Introspection | Server-side validation of session cookie producing identity headers. |
| ThriveAuthContext | In-memory PHP object built from `X-Auth-Context`. |
| ThriveRole | PHP enum for type-safe role definitions (`admin`, `teacher`). |
| Unified Origin | Single base URL for WP + API to simplify cookies & CORS. |
| Role Detection | Single SQL query to determine user roles from multiple tables. |
| Upsert | Atomic database operation combining INSERT and UPDATE. |able with tier system (10/20/30...)
* **Class types**: 1‑to‑1, group (capacity 5 baseline), multi‑session courses
* **Scheduling**: recurring availability, blackout windows, waitlists
* **Teacher tiers** (10/20/30 …; extensible gaps e.g. 15/25)
* **Packages**: bundles of various class credits + materials
* **Cancellation policy & dispute workflow** (time‑based forfeits)
* **Materials** (PDF/video/audio/link) with access checksitectural instructions for the hybrid WordPress + NestJS language learning platform. It merges the contents of the per-layer Copilot instruction files so contributors have a single authoritative reference. Always update this file when behavior, flows, or guarantees change.

---
## 1. Core Services & Deployment Model

| Service | Purpose | Dev Endpoint | Notes |
|---------|---------|--------------|-------|
| Nginx (web) | Unified reverse proxy + header injection | http://localhost:8080 | Fronts WP & NestJS under single origin |
| WordPress | Presentation + CMS authoring | (proxied) | No longer system-of-record for auth |
| NestJS API | Business logic + auth authority | http://localhost:3000 | Stateless + future standalone deployment |
| MariaDB | Persistent data store | internal (3306) | Shared for now; treat as replaceable |

Single VPS deploy: all containers run on one host; no external managed dependencies required beyond Docker.

### Docker / Compose Expectations
* One `docker-compose up` boots the stack.
* Custom volumes: plugin code, logs (`_logs_wp/`), database data.
* Internal network: `wordpress_net` for service-to-service communication (`http://nestjs:3000` from WP).

### File Skeleton (Simplified)
```
docker-compose.yml
nestjs/
wordpress/
    plugins/nodejs-bridge/
    themes/custom-theme/
nginx/
```

---
## 2. NestJS Platform Specification

The NestJS app is a standalone headless API for multi‑channel consumption (WordPress today; SPA / mobile later).

### Architecture Tenets
* Treat DB as generic MySQL (future swap OK).
* All datetimes stored UTC.
* TypeORM migrations define schema evolution.
* Soft deletes where user/business data longevity matters.

### Authentication (Canonical)
* Supports Email/Password & Google OAuth (Passport strategies).
* Issues a signed session cookie (`thrive_sess` by default) – HS256 with `SESSION_SECRET`.
* Future-ready for JWT access + refresh token pair (rotation, device/session tracking).
* Introspection endpoint `/auth/introspect` validates cookie and returns minimal JSON identity for Nginx.

#### Core Auth Features (Current / Planned)
| Feature | Status |
|---------|--------|
| Email registration & login | In progress / baseline |
| Google OAuth | Implemented (redirect + session) |
| Session cookie (HttpOnly) | Implemented |
| Refresh token rotation | Planned |
| Email verification | Planned |
| Password reset | Planned |
| Rate limiting & lockout | Planned |
| 2FA (TOTP) for elevated roles | Planned |

#### Google OAuth Env Vars
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `WP_BASE_URL`.

#### Roles & Permissions (Current Implementation)
* **Database Tables**: `user`, `admin`, `teacher` (one-to-one relationships)
* **Role Types**: `admin`, `teacher` (defined in `ThriveRole` enum)
* **Role Detection**: Single SQL query in `getUserRoles()` method
* **Type Safety**: PHP `ThriveRole` enum for compile-time validation

#### Current Role System
| Role | Table | Description |
|------|-------|-------------|
| `admin` | `admin` | Full system access, user management |
| `teacher` | `teacher` | Teaching capabilities, availability management |

#### Role Detection Flow
1. NestJS `getUserRoles()` executes single UNION query
2. Roles included in JWT session payload
3. Passed to WordPress via `X-Auth-Roles` header
4. PHP parses into `ThriveRole[]` enum array
5. Templates use `thrive_user_has_role(ThriveRole::ADMIN)`

#### Business Domain Highlights
* Class types: 1‑to‑1, group (capacity 5 baseline), multi‑session courses.
* Scheduling: recurring availability, blackout windows, waitlists.
* Teacher tiers (10/20/30 …; extensible gaps e.g. 15/25).
* Packages: bundles of various class credits + materials.
* Cancellation policy & dispute workflow (time‑based forfeits).
* Materials (PDF/video/audio/link) with access checks.

#### External Integrations (Planned / Future)
Stripe, Google Classroom, Google Calendar (bi‑directional), AWS S3, feature flags, audit logging.

---

## 3. WordPress Layer – Reverse Proxy & Session-Aware Integration

### Editor-First, Block-Driven Theme Structure

**Imperative:** All user-facing content and UI must be implemented using WordPress blocks that are easily editable in the block editor. This enables non-technical admins to update text, colors, layout, and settings visually, without code changes.

**Block Development Guidelines:**
- Use custom blocks (block.json + JS/TSX + PHP render) for dynamic features.
- Expose all relevant attributes (text, color, alignment, etc.) in the block editor sidebar.
- Ensure the PHP render template uses all block attributes (backgroundColor, textColor, align, style, etc.) so that changes in the editor are reflected on the frontend.
- Avoid hardcoded content or styles in PHP; rely on block attributes and theme.json presets.
- Document block conventions in the theme README for maintainability.

**Example:**
The login/auth block exposes all button text, modal labels, provider toggles, and color/alignment options as block attributes. The PHP template renders these attributes, ensuring the frontend matches the editor preview.

**Rationale:**
This structure empowers non-technical admins, reduces developer intervention, and ensures a modern, maintainable, and WYSIWYG WordPress experience.

WordPress acts purely as the presentation + editorial layer. It does NOT own authentication state. All authenticated rendering depends on headers injected by Nginx after NestJS introspection.

### Auth Flow (Runtime)
1. Browser → Nginx (single origin http://localhost:8080).
2. If `thrive_sess` cookie present: Nginx internally calls NestJS `/auth/introspect`.
3. NestJS validates & returns JSON identity.
4. Nginx injects headers:
     * `X-Auth-Email`
     * `X-Auth-Name`
     * `X-Auth-User-Id`
     * `X-Auth-Roles`
     * `X-Auth-Context` (canonical JSON blob)
5. WP theme bootstrap (init priority 1) parses `X-Auth-Context` into in‑memory `ThriveAuthContext`.
6. Templates use `thrive_is_logged_in()` / `thrive_get_auth_context()`.

### Principles
* Source of truth = session cookie validated by NestJS.
* Do NOT use `is_user_logged_in()` for proxy sessions.
* No automatic `wp_users` creation (simplified model). Any persistence must be opt‑in.
* Role checks should examine `$ctx->roles` not WP roles (unless feature is WP‑local only).

### Helper Functions
| Helper | Purpose |
|--------|---------|
| `thrive_get_auth_context()` | Returns typed `ThriveAuthContext` or null |
| `thrive_is_logged_in()` | Boolean: context/header/cookie present |
| `thrive_get_auth_context_array()` | Legacy array form for embedding |
| `thrive_user_has_role($role)` | Check specific role (accepts string or `ThriveRole`) |
| `thrive_is_admin()` | Boolean: user has admin role |
| `thrive_is_teacher()` | Boolean: user has teacher role |
| `thrive_get_user_roles()` | Returns `ThriveRole[]` enum array |
| `thrive_get_user_role_strings()` | Returns `string[]` for backward compatibility |

Example usage:
```php
if ( thrive_is_logged_in() ) {
    $ctx = thrive_get_auth_context();
    echo 'Hi ' . esc_html($ctx?->name ?? 'Learner');
    
    // Role-based features
    if (thrive_is_admin()) {
        echo '<a href="/admin">Admin Panel</a>';
    }
    if (thrive_is_teacher()) {
        echo '<a href="/availability">Manage Availability</a>';
    }
} else {
    echo '<a href="/api/auth/google">Sign in</a>';
}
```

### Security Notes
* Cookie is HttpOnly, SameSite=Lax (dev); secure in prod.
* WP never needs session secret.
* Do not expose sensitive claims to client JS unless minimal + necessary.
* Guard `X-Auth-Context` size (<= 8KB) – enforced.
* **Type Safety**: PHP `ThriveRole` enum prevents invalid role values
* **Database Optimization**: Single SQL query for role detection (not multiple table lookups)

### Front-End Decisions
* Server-render gating first. JS can hydrate from `thrive_get_auth_context_array()` only if needed.
* Logout → `/api/auth/logout` (NestJS) then redirect clears headers next request.

### Database Schema & Optimizations

#### Current Tables
| Table | Purpose | Key Fields |
|-------|---------|------------|
| `user` | Base user accounts | `id`, `email`, `firstName`, `lastName`, `passwordHash` |
| `admin` | Administrative users | `userId` (FK), `role`, `isActive` |
| `teacher` | Teaching staff | `userId` (FK), `tier`, `bio`, `isActive` |
| `teacher_availability` | Teacher schedules | `teacherId` (FK), availability patterns |

#### Performance Optimizations
* **Single Query Role Detection**: `getUserRoles()` uses UNION query instead of multiple table lookups
* **Upsert Operations**: Google OAuth uses atomic create/update operations
* **Indexed Foreign Keys**: All relationships properly indexed for performance
* **Soft Deletes**: All tables support soft deletes with `deletedAt` field

#### Migration Strategy
* TypeORM migrations for schema evolution
* Idempotent operations (IF NOT EXISTS guards)
* Foreign key constraints with CASCADE deletes
* Proper indexing for query performance
3. Google login → redirected; personalized welcome renders.
4. Confirm headers appear in Network tab.
5. Logout removes headers / context.

### Common Pitfalls
* `current_user_can()` false? Not mapping WP users—use context roles.
* Need WP user ID? Implement explicit sync routine (future), don’t resurrect automatic mapping.
* Direct API call? Use same origin; browser sends cookie automatically.

---
## 4. Reverse Proxy / Nginx Contract

Nginx responsibilities:
* Terminate all client connections on 8080.
* Route `/api/` (or specific paths) to NestJS while preserving cookies.
* For HTML/page requests: if session cookie present, perform internal subrequest to `/auth/introspect` and inject auth headers.
* Strip any inbound spoofed `X-Auth-*` headers from clients.

Config Variables (Environment):
| Var | Purpose |
|-----|---------|
| `SESSION_SECRET` | HS256 signing secret (MUST override in prod) |
| `SESSION_COOKIE_NAME` | Defaults `thrive_sess` |
| `WP_BASE_URL` | Redirect target after auth success |

Cookie Characteristics:
* HttpOnly, SameSite=Lax (adjust to Strict if feasible), Secure flag in production.
* Expiry currently fixed (e.g., 30m). Consider renewal strategy.

Future Enhancements:
* Silent refresh endpoint & JS ping.
* Redis / centralized session store for instant revocation.
* Role sync for WP plugins needing native capabilities.
* Capability service consumed by all clients.

---
## 5. Development Workflow

### Start / Rebuild
`make run` or `docker-compose up --build`.

### Logs
| Service | Command |
|---------|---------|
| Nginx | `docker-compose logs -f web` |
| WordPress | `docker-compose logs -f wordpress` |
| NestJS | `docker-compose logs -f nestjs` |

### Plugin / Theme Dev
* Files mounted as volumes – immediate reflection on reload.
* Use `_logs_wp/` for debug output (PHP `error_log`).

### NestJS Dev
* Hot reload via `npm run start:dev` inside container if configured.
* Add endpoints in `src/...` – reachable from WP via `http://nestjs:3000/<path>` or browser via `/api/<path>` (if proxied path configured).

---
## 6. Security & Quality Gates

| Concern | Current Practice | Future Action |
|---------|------------------|---------------|
| Secrets | `.env.local` for dev | Vault / secrets manager prod |
| Session Expiry | Fixed window | Add refresh & rotation |
| Authorization | Roles array | Fine-grained permissions service |
| Input Validation | NestJS DTOs planned | Enforce class-validator + Zod tests |
| PHP Quality | phpstan config present | Raise level & CI gate |

Minimum Dev Checklist Before Commit:
1. phpstan passes (no new errors).
2. TypeScript builds without errors.
3. Added/updated migrations when entity schema changed.
4. Updated this doc if contract/flow changed.

---
## 7. Glossary
| Term | Definition |
|------|------------|
| Introspection | Server-side validation of session cookie producing identity headers. |
| ThriveAuthContext | In-memory PHP object built from `X-Auth-Context`. |
| Unified Origin | Single base URL for WP + API to simplify cookies & CORS. |

---
## 8. Quick Reference Snippets

Check login in PHP:
```php
if ( thrive_is_logged_in() ) { /* ... */ }
```

Fetch API from WP (server-side):
```php
$resp = wp_remote_get('http://nestjs:3000/health');
```

Client JS POST (cookie auto-sent):
```js
fetch('/api/classes', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({})});
```

---
## 9. Roadmap (Prioritized Next Steps)
1. Add refresh token rotation + silent renew.
2. Implement role-based permission matrix service.
3. Stripe integration (payments + packages).
4. Scheduling + availability modeling.
5. Material access controls & storage integration.
6. Email verification + password reset flows.
7. Audit/event logging pipeline.

---
Maintainers: Keep this file the canonical truth. If another markdown or instruction file diverges, update or remove the duplicate.