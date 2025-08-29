// Shared types based on backend DTOs
// These should match the structure in nestjs/src/users/dto/user-response.dto.ts

export interface AdminResponse {
  id: number;
  role: string;
  isActive: boolean | number; // API returns number (0/1), but we transform to boolean
  createdAt: string;
  updatedAt: string;
}

export interface TeacherResponse {
  id: number;
  tier: number;
  bio: string | null;
  isActive: boolean | number; // API returns number (0/1), but we transform to boolean
  createdAt: string;
  updatedAt: string;
}

export interface UserResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
  admin?: AdminResponse;
  teacher?: TeacherResponse;
}

export interface PaginatedUsersResponse {
  users: UserResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API Request types
export interface UsersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

// Generic API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Error response
export interface ApiError {
  success: false;
  data: {
    message: string;
    statusCode?: number;
  };
}
