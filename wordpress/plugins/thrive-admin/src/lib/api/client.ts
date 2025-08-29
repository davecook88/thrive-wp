import { z } from "zod";
import type { ApiResponse } from "../types/users";

// Generic API client class
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "/api") {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    responseSchema?: z.ZodType<T>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        credentials: "include", // Include cookies for authentication
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      // If we have a schema, validate the response
      if (responseSchema) {
        const validationResult = responseSchema.safeParse(data);
        if (!validationResult.success) {
          throw new Error(
            `API response validation failed: ${validationResult.error.message}`
          );
        }
        return validationResult.data;
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Unknown API error");
    }
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
    responseSchema?: z.ZodType<T>
  ): Promise<T> {
    let fullEndpoint = endpoint;

    if (params) {
      const url = new URL(endpoint, window.location.origin);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.append(key, String(value));
        }
      });
      fullEndpoint = url.pathname + url.search;
    }

    return this.request<T>(
      fullEndpoint,
      {
        method: "GET",
      },
      responseSchema
    );
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    responseSchema?: z.ZodType<T>
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
      },
      responseSchema
    );
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    responseSchema?: z.ZodType<T>
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
      },
      responseSchema
    );
  }

  async delete<T>(endpoint: string, responseSchema?: z.ZodType<T>): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "DELETE",
      },
      responseSchema
    );
  }
}

// Create a singleton instance
export const apiClient = new ApiClient();
