# Users API

## GET /users

Retrieves a paginated list of users with their admin and teacher role information. This endpoint requires admin authentication.

### Authentication
- Requires admin role authentication via JWT token in cookies
- Uses the `AdminGuard` to verify admin privileges

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number for pagination |
| `limit` | number | 10 | Number of users per page (max 100) |
| `search` | string | - | Search term to filter users by email, first name, or last name |
| `role` | string | - | Filter by role: 'admin' or 'teacher' |

### Response Format

```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "admin": {
        "id": 1,
        "role": "admin",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      },
      "teacher": null
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### Example Requests

```bash
# Get first page of users
GET /users

# Get users with search
GET /users?search=john

# Get only admin users
GET /users?role=admin&page=1&limit=20

# Get teachers with pagination
GET /users?role=teacher&page=2&limit=5
```

### Error Responses

- `401 Unauthorized`: No authentication token or invalid/expired token
- `401 Unauthorized`: User does not have admin role
- `400 Bad Request`: Invalid pagination parameters or role filter

### Features

- **Pagination**: Efficient pagination with configurable page size
- **Search**: Full-text search across email, first name, and last name
- **Role Filtering**: Filter users by admin or teacher roles
- **Joins**: Includes admin and teacher relationship data in response
- **Soft Deletes**: Excludes soft-deleted users from results
- **Sorting**: Results ordered by creation date (newest first)
