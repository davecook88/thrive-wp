// Re-export shared types to maintain local compatibility
export type {
  AdminResponse,
  TeacherLocation,
  TeacherResponse,
  UserResponse,
  PaginatedUsersResponse,
  UsersQueryParams,
} from "@thrive/shared";

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
