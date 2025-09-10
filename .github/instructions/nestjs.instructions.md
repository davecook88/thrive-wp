---
applyTo: 'nestjs/**'
---

## NestJS Language School Platform

Build an online language school platform using NestJS that provides a headless REST API. The system must support multiple front-end integrations, with initial WordPress plugin integration and future standalone capability.

# Architecture 
This app must be totally standalone and able to be deployed separately in the future if required.
This app will share the WP MySQL db for now but it should be treated as if it were any db.

## Node Setup
- DO NOT use commonjs. This must use ESM (ECMAScript Modules)

## Database Requirements

- Use MySQL database with TypeORM for elegant migration management and version control
- All datetime fields must be stored as UTC
- Implement soft deletes where appropriate
- Design schema to support multi-tenancy patterns for future scaling
- DB table names MUST be singular
- **ALL DATABASE COLUMNS MUST BE SNAKE_CASE** (e.g., `first_name`, `user_id`, `is_active`)
  - Use TypeORM's `@Column({ name: 'column_name' })` to map camelCase properties to snake_case columns
  - This ensures consistency across the database schema and prevents naming conflicts

## Authentication System

### Architecture
- Implement standalone JWT-based authentication system in NestJS
- Support multiple authentication methods: email/password, Google OAuth
- Use JWT tokens for session management with refresh token capability
- Design API to be platform-agnostic while maintaining WordPress integration option
- Store all user data in internal database with optional WordPress sync

### Core Authentication Features
- Email/password registration and login
- Google OAuth 2.0 integration using Passport.js
- JWT access tokens (short-lived, 15-30 minutes)
- Refresh tokens (long-lived, 30 days) with rotation
- Email verification for new accounts
- Password reset functionality
- Account lockout after failed login attempts

### WordPress Integration (Optional)
- Maintain WordPress user sync capability for existing sites
- Sync user data bidirectionally when WordPress integration is enabled
- Support WordPress session validation for hybrid deployments
- Allow gradual migration from WordPress to standalone authentication

### Security Requirements
- Implement rate limiting on authentication endpoints
- Use bcrypt for password hashing
- Validate email domains and implement disposable email detection
- Support two-factor authentication (TOTP) for admin and teacher accounts
- Maintain audit log of authentication events
- Implement session management with device tracking

### Authentication Flow
1. User registers via API with email verification
2. User logs in with email/password or Google OAuth
3. System generates JWT access token and refresh token
4. Client uses access token for API requests
5. Client refreshes tokens before expiration
6. System tracks active sessions and allows remote logout

### Google OAuth Implementation Details
- Endpoint to initiate: `GET /auth/google`
- Callback endpoint: `GET /auth/google/callback`
- Required env vars (set in `.env.local` loaded via docker-compose):
	- `GOOGLE_CLIENT_ID`
	- `GOOGLE_CLIENT_SECRET`
	- `GOOGLE_CALLBACK_URL` (defaults to `http://localhost:3000/api/auth/google/callback` if unset)
	- `WP_BASE_URL` (used to redirect user back after successful auth)
- On successful callback, server currently 302 redirects to `${WP_BASE_URL}/?auth=success`.
- Extend later to issue JWT (access + refresh) and set HttpOnly cookies for WordPress origin.

## User Roles & Permissions

### Current Implementation
- **Database Tables**: `user`, `admin`, `teacher`, `student` with one-to-one relationships
- **Role Types**: `admin`, `teacher`, `student` (defined as string constants)
- **Role Detection**: Optimized single SQL query in `getUserRoles()` method
- **Type Safety**: PHP `ThriveRole` enum provides compile-time validation

### Base Roles
- **Public**: Can view available classes and pricing
- **Student**: Default role for all users (automatic via database trigger), can view own records, available classes, enroll, manage bookings
- **Teacher**: Can manage own availability, view assigned classes and student records, update class materials
- **Admin**: Full system access, can edit any record, manage disputes, configure system settings

### Database Schema
```sql
-- User table (base accounts)
CREATE TABLE user (
  id int PRIMARY KEY AUTO_INCREMENT,
  email varchar(255) UNIQUE,
  first_name varchar(255),
  last_name varchar(255),
  password_hash varchar(255) NULL,
  created_at datetime,
  updated_at datetime,
  deleted_at datetime NULL
);

-- Admin table (one-to-one with user)
CREATE TABLE admin (
  id int PRIMARY KEY AUTO_INCREMENT,
  user_id int UNIQUE,
  role varchar(100) DEFAULT 'admin',
  is_active tinyint DEFAULT 1,
  created_at datetime,
  updated_at datetime,
  deleted_at datetime NULL,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Teacher table (one-to-one with user)
CREATE TABLE teacher (
  id int PRIMARY KEY AUTO_INCREMENT,
  user_id int UNIQUE,
  tier smallint DEFAULT 10,
  bio text NULL,
  is_active tinyint DEFAULT 1,
  created_at datetime,
  updated_at datetime,
  deleted_at datetime NULL,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Student table (one-to-one with user)
CREATE TABLE student (
  id int PRIMARY KEY AUTO_INCREMENT,
  user_id int UNIQUE,
  created_at datetime,
  updated_at datetime,
  deleted_at datetime NULL,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Database trigger to auto-create student record for new users
CREATE TRIGGER create_student_on_user_insert
AFTER INSERT ON user
FOR EACH ROW
BEGIN
  INSERT INTO student (user_id, created_at, updated_at)
  VALUES (NEW.id, NEW.created_at, NEW.created_at);
END;
```

### Role Detection Optimization
The `getUserRoles()` method uses a single SQL query instead of multiple database calls:
```sql
SELECT 'admin' as role FROM admin WHERE user_id = ? AND is_active = 1
UNION ALL
SELECT 'teacher' as role FROM teacher WHERE user_id = ? AND is_active = 1
UNION ALL
SELECT 'student' as role FROM student WHERE user_id = ? AND deleted_at IS NULL
```

## Class Management System

### Service Types
- **PRIVATE**: One-to-one individual sessions with teacher selection and time slot booking
- **GROUP**: Group classes with enrollment limits (configurable max 5 students initially)
- **COURSE**: Multi-session programs with structured curriculum and materials

### Scheduling Requirements
- Teachers set availability as one-off or recurring patterns
- All users interact with system in their local timezone
- Store all times as UTC strings in database
- Support complex availability patterns (weekly recurring, specific dates, blackout periods)
- Implement waitlist system for overbooked classes with automatic promotion

## Business Logic Requirements

### Teacher Management
- Teachers must be invited by admins (no self-registration)
- Implement teacher tier system (10, 20, 30, etc.) for pricing and access control
- Tiers should be easily extensible (allow 15, 25 intermediate tiers)
- Teacher tier affects package restrictions and pricing

### Package & Pricing System
- Primary sales model: packages/bundles containing combinations of service types
- Packages can include: private sessions, group class credits, course enrollments, materials
- Package restrictions: specific teacher tiers, subjects, validity periods
- Support bulk pricing discounts
- Course packages may include private session allowances

### Cancellation & Dispute System
- Configurable cancellation policies per service type
- Time-based cancellation rules (hours before class)
- Automatic forfeit system for late cancellations
- Student dispute system with admin review workflow
- Track cancellation history for policy enforcement

## Integration Requirements

### External Services
- **Stripe**: Handle all payment processing and subscription management
- **Google Classroom**: Class delivery platform integration
- **Google Calendar**: Bi-directional calendar sync for all user types
- **AWS S3**: Store and serve educational materials and resources

### WordPress Integration
- The plugin defined in wordpress/plugins/nodejs-bridge will be responsible for proxying requests between the WP app and the NestJS app.

## Material Management
- Support multiple material types: PDFs, videos, audio, interactive content, external links
- Materials can be bundled with courses or sold separately
- Implement access control based on purchases and enrollments
- Track material usage and completion (future analytics)

## System Configuration
- Make business rules configurable: class sizes, cancellation windows, teacher tiers
- Support multiple currencies (start with USD)
- Implement feature flags for gradual rollout of new functionality
- Maintain audit trails for all critical business operations