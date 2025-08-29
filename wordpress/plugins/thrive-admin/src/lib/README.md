# Thrive Admin API Client

This directory contains a structured API client for the Thrive Admin plugin, providing type-safe communication with the NestJS backend.

## Structure

```
lib/
├── types/          # TypeScript interfaces matching backend DTOs
├── schemas/        # Zod validation schemas
├── api/           # API client and service classes
├── composables/   # Vue composables for reactive data management
├── utils/         # Utility functions
└── index.ts       # Main exports
```

## Features

- **Type Safety**: Full TypeScript support with interfaces matching backend DTOs
- **Runtime Validation**: Zod schemas validate API responses at runtime
- **Reactive Composables**: Vue 3 composables for reactive state management
- **Error Handling**: Comprehensive error handling with authentication support
- **Shared Types**: Types are shared between frontend and backend

## Usage

### Basic API Calls

```typescript
import { UsersApiService, type UsersQueryParams } from '../lib';

// Get paginated users with filters
const params: UsersQueryParams = {
  page: 1,
  limit: 20,
  search: 'john',
  role: 'admin'
};

const response = await UsersApiService.getUsers(params);
if (response) {
  console.log(response.users);
  console.log(`Total: ${response.total}`);
}
```

### Using Composables

```typescript
import { useUsers } from '../lib';

export default {
  setup() {
    const {
      users,
      loading,
      error,
      filters,
      loadUsers,
      handleFilter
    } = useUsers({
      initialPage: 1,
      initialSearch: '',
      initialRole: ''
    });

    return {
      users,
      loading,
      error,
      filters,
      loadUsers,
      handleFilter
    };
  }
};
```

## API Client Configuration

The API client is configured to work with the nginx reverse proxy setup:

- Base URL: `/api` (proxied to NestJS backend)
- Credentials: Included automatically for authentication
- Content-Type: `application/json` for POST/PUT requests
- Response Format: Direct data (not wrapped in success/data structure)

## Response Format

The NestJS API returns data directly, not wrapped in a success/data structure:

```typescript
// Direct response format (what we get)
{
  users: UserResponse[],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}

// Not wrapped like this (what I initially assumed)
{
  success: true,
  data: { users: [...], total: 4, ... },
  message?: string
}
```

## Authentication

The API client automatically includes cookies for session-based authentication. The nginx proxy handles authentication checks and forwards user context headers to the NestJS backend.

```typescript
try {
  const response = await UsersApiService.getUsers();
  if (response) {
    // Handle success - response is the data directly
    console.log(response.users);
  } else {
    // Handle empty or invalid response
    console.error('No data received');
  }
} catch (error) {
  // Handle network or validation errors
  console.error(error.message);
}
```

## Authentication

The API client automatically includes cookies for session-based authentication. The nginx proxy handles authentication checks and forwards user context headers to the NestJS backend.
