# AI Test Accounts

This document describes the stable test accounts available for AI agents and developers to use for testing the application.

## Setup

To ensure these accounts exist, run the seed script:

```bash
# From the root directory
cd apps/nestjs
npm run seed:test-users
```

Or if running locally with Docker:

```bash
# Ensure DB is running
cd apps/nestjs
DB_HOST=localhost npm run seed:test-users
```

## Accounts

All accounts use the same password: `thrive_test_123`

| Role | Email | Description |
|---|---|---|
| **Student** | `student@thrive.com` | Standard student account. |
| **Teacher** | `teacher@thrive.com` | Teacher account with default tier (10). |
| **Admin** | `admin@thrive.com` | Administrator account with full access. |

### WordPress Admin Access

> [!IMPORTANT]
> The `admin@thrive.com` account seeded in NestJS does not automatically have access to `/wp-admin` unless the role mapping is correctly configured and the user has visited the site to trigger the auth hook.
>
> If you cannot log in to `/wp-admin` with `admin@thrive.com`, you may need to:
> 1. Ensure the `X-Auth-Context` header is being passed (requires Nginx/proxy).
> 2. Or use the provided WP seed script to create/update users directly in WordPress.

### Running the WP Seed Script

To ensure all test users (Admin, Teacher, Student) exist in WordPress with the correct roles and passwords:

**Option 1: Via Browser**
Visit: `http://localhost:8080/wp-content/themes/custom-theme/scripts/seed-wp-users.php`

**Option 2: Via CLI (Docker)**
```bash
docker-compose exec wordpress wp eval-file wp-content/themes/custom-theme/scripts/seed-wp-users.php
```

## Usage in Playwright / E2E Tests

When writing tests, you can use these credentials to log in programmatically.

The login flow uses a modal on the homepage rather than a dedicated login page.

Example (Playwright):

```typescript
await page.goto('/');
await page.getByRole('button', { name: 'Sign in' }).click();

// Wait for modal
await expect(page.getByRole('dialog', { name: 'Sign In' })).toBeVisible();

// Fill credentials
await page.fill('input[type="email"]', 'student@thrive.com');
await page.fill('input[type="password"]', 'thrive_test_123');

// Click sign in
await page.getByRole('button', { name: 'Sign in with Email' }).click();

// Verify login (e.g. check for user menu or dashboard redirect)
await expect(page).toHaveURL('/'); // Or wherever it redirects
```

## Notes

- These accounts are idempotent; running the seed script multiple times will not duplicate them (it will update them if they exist).
- Do not use these accounts for production data.
