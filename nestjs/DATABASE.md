# Database Setup Guide

This NestJS application uses TypeORM with MySQL for database management. The database setup follows the requirements for a language school platform with JWT authentication, user management, class scheduling, and WordPress integration capabilities.

## Database Configuration

The application connects to the shared MySQL database used by WordPress. Configuration is handled through environment variables:

- `DB_HOST`: Database host (default: 'db' for Docker)
- `DB_PORT`: Database port (default: 3306)
- `DB_USERNAME`: Database username (default: 'wordpress')
- `DB_PASSWORD`: Database password (default: 'wordpress')
- `DB_DATABASE`: Database name (default: 'wordpress')

## Entity Structure

### Core Entities

1. **User Entity** (`users`)
   - Comprehensive user management with role-based permissions
   - Support for multiple authentication providers (local, Google, WordPress)
   - Teacher tier system for pricing and access control
   - Email verification and account security features

2. **RefreshToken Entity** (`refresh_tokens`)
   - JWT refresh token management
   - Device and session tracking
   - Token rotation and security features

3. **Class Entity** (`classes`)
   - Flexible class management (one-to-one, group, courses)
   - Teacher assignment and scheduling
   - Pricing and currency support
   - Integration with external platforms (Google Classroom)

### Key Features

- **UTC Timezone Storage**: All datetime fields stored as UTC
- **Soft Deletes**: Implemented where appropriate using `deletedAt` field
- **Audit Trails**: Base entity includes `createdAt` and `updatedAt`
- **Indexing**: Strategic indexes for performance on frequently queried fields
- **Multi-tenancy Ready**: Schema designed for future scaling

## Development Workflow

### Installing Dependencies

```bash
npm install
```

### Database Operations

```bash
# Generate new migration based on entity changes
npm run migration:generate -- src/migrations/InitialMigration

# Create empty migration file
npm run migration:create -- src/migrations/CreateIndexes

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Sync schema (development only - be careful!)
npm run schema:sync

# Drop entire schema (destructive!)
npm run schema:drop
```

### Environment Setup

1. Copy the `.env` file with appropriate database credentials
2. Ensure MySQL/MariaDB is running (via Docker Compose)
3. Run migrations to set up the schema

### Docker Integration

The application is configured to work with the existing Docker Compose setup:

- Database host uses 'db' (Docker internal hostname)
- Shares the WordPress MySQL database
- Automatic synchronization in development mode
- Migration support for production deployments

## Migration Strategy

### Development
- `synchronize: true` for rapid development
- Entity changes automatically reflected
- Use migrations for complex schema changes

### Production
- `synchronize: false` always
- All changes via migrations
- Rollback capability for safe deployments

## Security Considerations

- Password hashing with bcrypt
- JWT token security with rotation
- Rate limiting on authentication endpoints
- SQL injection protection via TypeORM
- Soft deletes for data retention
- Audit logging for critical operations

## WordPress Integration

The schema is designed to coexist with WordPress tables:

- Uses different table prefixes to avoid conflicts
- Optional WordPress user sync via `wordpressUserId` field
- Maintains referential integrity while allowing independent operation
- Future migration path from WordPress to standalone

## Performance Optimizations

- Strategic indexing on frequently queried columns
- Foreign key constraints for data integrity
- Efficient relationship loading patterns
- Connection pooling for high concurrency
- UTC timezone handling for global users

## Monitoring and Maintenance

- Database logging in development mode
- Migration tracking and version control
- Schema validation and consistency checks
- Performance monitoring hooks ready for integration
- Backup and recovery procedures (to be implemented)
