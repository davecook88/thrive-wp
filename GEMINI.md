# WordPress Development Environment Setup

You are tasked with creating a development environment for a WordPress application. The environment must use Docker to manage services and allow for easy development and testing of custom plugins. This setup includes a NestJS backend service that communicates with WordPress.

Always update this file after any changes which make this irrelevant.

## Project Architecture Requirements

### Core Services
1.  **WordPress Service** (PHP/Apache)
    -   Based on a custom Dockerfile.
    -   Handles all WordPress functionality.
    -   Custom plugins will be mounted directly into the container.
2.  **Database Service** (MariaDB)
    -   A `mariadb:10.6` database for all WordPress data.
3.  **NestJS Service**
    -   A Node.js backend application built with the NestJS framework.
    -   Runs in its own container and communicates with the WordPress service.

## Docker Environment Requirements

### Development Environment (docker-compose.yml)
Create a Docker Compose setup with the following services:
-   `wordpress`: The main WordPress application.
-   `db`: The MariaDB database.
-   `nestjs`: The NestJS backend service.

### Volume requirements:
-   A volume for the custom WordPress plugin(s) (`nodejs-bridge`).
-   A volume for the WordPress debug log (`_logs_wp`).
-   A volume for persistent database storage.

### Environment variables:
-   Database credentials for WordPress.
-   WordPress configuration settings (e.g., debug flags, site URL).

## Specific Implementation Tasks

### 1. WordPress Setup
-   Use a custom `Dockerfile` to build the WordPress image.
-   Configure the site URL to `http://localhost:8080` via environment variables in `docker-compose.yml`.
-   Mount the `nodejs-bridge` custom plugin from the local filesystem into the `wp-content/plugins` directory.

### 2. Database Schema
-   The database schema will be managed entirely by WordPress.

### 3. NestJS Service Setup
-   The service is built from the `nestjs/Dockerfile`.
-   It is accessible on port `3000`.

### 4. Docker Orchestration
-   Define service dependencies (`wordpress` depends on `db` and `nestjs`).
-   Use a custom bridge network (`wordpress_net`) for communication between services.
-   Use a root `Dockerfile` to apply any necessary customizations to the base WordPress image.

## File Structure Expected

```
project-root/
├── docker-compose.yml
├── Dockerfile
├── .env.local
├── nestjs/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       └── main.ts
└── wordpress/
    └── plugins/
        └── nodejs-bridge/
            ├── nodejs-bridge.php
            └── includes/
                └── class-nodejs-bridge.php
```

## Success Criteria
-   A single `docker-compose up` command starts the entire development environment.
-   The WordPress site is accessible at `http://localhost:8080`.
-   The NestJS service is accessible at `http://localhost:3000`.
-   Developers can work on custom plugins in the `wordpress/plugins` directory, and changes are reflected live in the running container.
-   The setup is clean, simple, and easy for new developers to understand.

## Added: Unified Domain & Reverse Proxy Auth (Dev Enhancement)

An Nginx `web` service now fronts WordPress and NestJS to provide a single origin (http://localhost:8080) and inject authenticated user context into WordPress at render time.

Flow:
1. User authenticates via Google OAuth (NestJS `/auth/google`).
2. NestJS issues a short‑lived signed session cookie (`thrive_sess`, HS256, 30m) and redirects back to WordPress base URL.
3. Every page request hits Nginx → internal subrequest to `/auth/introspect` on NestJS.
4. Introspect validates the cookie and returns identity via `X-Auth-*` headers.
5. Nginx forwards headers to WordPress; plugin creates/loads corresponding WP user during `init` for template conditionals.

Config Vars:
- `SESSION_SECRET` (NestJS) – MUST override in production.
- `SESSION_COOKIE_NAME` (optional) – default `thrive_sess`.
- `WP_BASE_URL` – base URL used for post-login redirect.

Security Notes:
- Dev secret is insecure; replace before deploy.
- Cookie: HttpOnly, SameSite=Lax (adjust to `Strict` if compatible), `Secure` automatically when `NODE_ENV=production`.
- Revocation currently time-based; consider adding a denylist or session store for immediate logout if needed.

Next Potential Improvements:
- Refresh endpoint & silent renewal JS.
- Role synchronization.
- Optional Redis-backed session for instant revocation.