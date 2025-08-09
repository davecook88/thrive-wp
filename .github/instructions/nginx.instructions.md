---
applyTo: 'nginx/**'
---
# Nginx Reverse Proxy & Auth Gateway Instructions

## Purpose
This Nginx service ("web") provides a single public origin (http://localhost:8080 in dev) that fronts:
- WordPress (PHP) – primary site rendering
- NestJS API – accessed only through curated proxy routes
- Authentication introspection – internal subrequest to enrich WordPress with user identity at render time

## Key Responsibilities
1. Single-domain aggregation (eliminates cross-site cookie issues)
2. Conditional auth header injection (only when a valid session cookie exists)
3. Fail‑open behavior (WordPress still serves anon pages if auth upstream is down)
4. Path routing (/api/, /auth/, root → WordPress)
5. Security header propagation (X-Forwarded-* + identity headers)

## Current Routing (default.conf)
| Path               | Upstream              | Notes |
|--------------------|-----------------------|-------|
| `/` (everything else) | `wordpress:80`        | Runs `auth_request /_auth_maybe` first. Injects X-Auth-* headers when session valid. |
| `/api/`            | `nestjs:3000`          | General API endpoints (Host preserved with port). |
| `/auth/`           | `nestjs:3000/auth/`    | Authentication (Google OAuth, sessions). |
| `/_auth_maybe`     | `nestjs:3000/auth/introspect` | Internal only; returns 204 quickly if no `thrive_sess` cookie. |

## Auth Flow Summary
1. Browser requests any page → Nginx calls `/_auth_maybe` (internal).
2. If no `thrive_sess` cookie: subrequest short-circuits (204) → WordPress served anon.
3. If cookie exists: Nginx forwards to NestJS `/auth/introspect`.
4. On 200: Response headers `X-Auth-User-Id|Email|Name|Roles` captured and forwarded to WordPress as request headers.
5. WordPress plugin maps those headers to a WP user object during `init`.
6. On 4xx/5xx from introspect: error_page fallback → `@unauth` (empty auth headers) to keep site responsive.

## Adding New Public API Routes
Prefer putting all public REST endpoints under `/api/` in NestJS (e.g. controller path `@Controller('courses')` → `/api/courses`). No Nginx change required.

If you must expose a new top-level path (e.g. `/realtime/` for websockets):
1. Add new `location /realtime/ { ... }` before the generic `/` block.
2. Include standard proxy headers:
   ```nginx
   proxy_set_header Host $http_host;
   proxy_set_header X-Forwarded-Host $http_host;
   proxy_set_header X-Forwarded-Proto $scheme;
   proxy_set_header X-Forwarded-Port $server_port;
   ```
3. For websockets add:
   ```nginx
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection $connection_upgrade;
   ```

## Modifying Auth Behavior
- Cookie Name: Default `thrive_sess` (change in NestJS env). If changed, update the `if` guard inside `/_auth_maybe`.
- Fail Closed Mode: Remove / adjust `error_page ... = @unauth;` to return 500 instead of anon fallback (not recommended for public site availability).
- Force Auth For Specific Paths: Add a new `location` block before `/` without the short‑circuit logic and REQUIRE `auth_request` (e.g. for `/dashboard/`).

Example protected path:
```nginx
location /dashboard/ {
  auth_request /_auth_maybe; # still short-circuits if missing cookie
  error_page 401 403 204 = @login_redirect;
  proxy_pass http://wp_upstream;
}
location @login_redirect { return 302 /?login=1; }
```
(You would adjust introspect to emit 401 when invalid/expired.)

## Security Considerations
- Do NOT expose NestJS container port directly (no `ports:` mapping in compose) – all access via Nginx.
- Only `/api/` and `/auth/` are intentionally exposed; everything else to NestJS is internal.
- The database is currently published (3306:3306). To prevent host access, remove the `ports:` mapping and use `expose: ['3306']` if local host access is not required.
- Ensure `SESSION_SECRET` (NestJS) is overridden in production.
- Consider adding security headers (Content-Security-Policy, X-Frame-Options) in this config before production.

## Hardening Steps (Optional Roadmap)
1. Remove DB port publish (replace with expose) to restrict to Docker network.
2. Add rate limiting (lua/nginx limit_req) on `/auth/` paths.
3. Enforce HTTPS (terminate TLS here) and set `Secure` cookie attribute.
4. Add `proxy_cache` for anonymous WordPress responses (bypass cache on `X-Auth-User-Id` present).
5. Implement Web Application Firewall rules (ModSecurity / NAXSI) if exposure grows.

## Troubleshooting
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Infinite 301 on `/` | Missing forwarded Host / port | Ensure Host & X-Forwarded-* set (already in config). |
| 500 with auth_request errors | NestJS down or connection refused | Check `nestjs` container logs; fallback should still serve anon. |
| No user recognized though logged in | Introspect not returning X-Auth-* headers | Inspect response headers; verify session cookie valid. |
| Header injection for everyone | Short-circuit condition removed | Ensure `/ _auth_maybe` still returns 204 when cookie absent. |

## Local Dev Commands
(From project root)
```
# Rebuild nginx after config changes
docker compose restart web

# Validate config syntax
docker compose exec web nginx -t

# Tail only nginx logs
docker compose logs -f web
```

## Making Config Changes
1. Edit `nginx/nginx.conf/default.conf` (volume-mounted, hot reload after `nginx -s reload` or container restart).
2. Run syntax test.
3. Reload: `docker compose exec web nginx -s reload`.
4. Validate with curl: `curl -I http://localhost:8080/`.

## Environment Assumptions
- Docker network DNS resolver: 127.0.0.11 (used in `resolver` directive) – keep unless network type changes.
- Single bridge network `wordpress_net` ensures container name resolution (e.g., `wordpress`, `nestjs`).

## When Editing Upstreams
Because we use simple `upstream` blocks with single servers, scaling horizontally would need either:
- Adding more `server` lines (manual round-robin), or
- Replacing with service discovery (not required currently).

## Checklist For New Auth-Dependent Feature
- [ ] Endpoint added under NestJS with proper route prefix
- [ ] Exposed path (if new prefix) added to nginx before `/`
- [ ] Introspection returns required identity claims
- [ ] WordPress plugin updated if new headers/roles needed
- [ ] Negative path test (no cookie) still serves anon or redirects appropriately

