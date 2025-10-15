import { apiClient } from "./client";
import {
  ApiResponseSchema,
  PaginatedUsersResponseSchema,
  UserResponseSchema,
} from "../schemas/users";
import type {
  UsersQueryParams,
  PaginatedUsersResponse,
  UserResponse,
  ApiResponse,
} from "../types/users";

// Users API service
export class UsersApiService {
  private static readonly BASE_ENDPOINT = "/users";

  static async getUsers(
    params: UsersQueryParams = {}
  ): Promise<PaginatedUsersResponse> {
    return apiClient.get<PaginatedUsersResponse>(
      this.BASE_ENDPOINT,
      params as Record<string, string | number | boolean>,
      PaginatedUsersResponseSchema
    );
  }

  static async getUserById(id: number): Promise<UserResponse> {
    return apiClient.get<UserResponse>(
      `${this.BASE_ENDPOINT}/${id}`,
      undefined,
      UserResponseSchema
    );
  }

  static async createUser(userData: {
    email: string;
    firstName: string;
    lastName: string;
    password?: string;
  }): Promise<UserResponse> {
    return apiClient.post<UserResponse>(
      this.BASE_ENDPOINT,
      userData,
      UserResponseSchema
    );
  }

  static async updateUser(
    id: number,
    userData: Partial<{
      email: string;
      firstName: string;
      lastName: string;
      password?: string;
    }>
  ): Promise<UserResponse> {
    return apiClient.put<UserResponse>(
      `${this.BASE_ENDPOINT}/${id}`,
      userData,
      UserResponseSchema
    );
  }

  static async deleteUser(id: number): Promise<void> {
    return apiClient.delete<void>(`${this.BASE_ENDPOINT}/${id}`);
  }

  // Admin-specific endpoints
  static async promoteToAdmin(userId: number): Promise<UserResponse> {
    return apiClient.post<UserResponse>(
      `${this.BASE_ENDPOINT}/${userId}/promote/admin`,
      undefined,
      UserResponseSchema
    );
  }

  static async demoteFromAdmin(userId: number): Promise<UserResponse> {
    return apiClient.post<UserResponse>(
      `${this.BASE_ENDPOINT}/${userId}/demote/admin`,
      undefined,
      UserResponseSchema
    );
  }

  // Teacher-specific endpoints
  static async promoteToTeacher(
    userId: number,
    tier: number = 10
  ): Promise<UserResponse> {
    return apiClient.post<UserResponse>(
      `${this.BASE_ENDPOINT}/make-teacher`,
      { tier, userId },
      UserResponseSchema
    );
  }

  static async updateTeacherTier(
    userId: number,
    tier: number
  ): Promise<UserResponse> {
    return apiClient.put<UserResponse>(
      `${this.BASE_ENDPOINT}/${userId}/teacher/tier`,
      { tier },
      UserResponseSchema
    );
  }
}
