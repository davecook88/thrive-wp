# UsersPage Components

This folder contains the refactored components for the Users management page.

## Components

### UsersFilters.vue
Handles the search and filter functionality for the users list.
- Search by name or email
- Filter by role (Admin, Teacher, Student)
- Clear filters functionality

### UsersTable.vue
Displays the users in a table format with the following columns:
- ID
- Name
- Email
- Role
- Status
- Created date
- Actions (View, Promote/Demote)

### UserActions.vue
Provides action buttons for promoting/demoting users:
- Promote/Demote to Admin
- Promote to Teacher (with tier selection)
- Update Teacher tier
- Demote from Teacher

### UsersPagination.vue
Handles pagination controls for the users list.

## Usage

The main `Users.vue` component orchestrates these smaller components and handles:
- Data fetching and state management via `useUsers` composable
- Authentication error handling
- User action handlers (promote/demote operations)

## API Integration

The components integrate with the existing `UsersApiService` which provides:
- `promoteToAdmin(userId)`
- `demoteFromAdmin(userId)`
- `promoteToTeacher(userId, tier)`
- `updateTeacherTier(userId, tier)`

## State Management

Uses the `useUsers` composable for:
- Users data and pagination
- Filtering and search
- Loading states and error handling
- User management operations
