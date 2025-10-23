import { z } from "zod";
import { ApiErrorResponseSchema } from "../types/api.js";

export class ThriveApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = "ThriveApiError";
  }
}

export class ThriveClient {
  private baseUrl: string;

  constructor(baseUrl: string = "/api") {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    schema?: z.ZodSchema<T>,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorData = await response.json();
        const parsedError = ApiErrorResponseSchema.safeParse(errorData);
        if (parsedError.success) {
          errorMessage = parsedError.data.message;
        }
      } catch {
        // If we can't parse the error response, use the default message
      }

      throw new ThriveApiError(errorMessage, response.status);
    }

    const data = await response.json();

    if (schema) {
      const result = schema.safeParse(data);
      if (!result.success) {
        throw new ThriveApiError(
          `Response validation failed: ${result.error.message}`,
          200,
          data,
        );
      }
      return result.data;
    }

    return data as T;
  }

  async getStudentStats() {
    const { StudentStatsResponseSchema } = await import(
      "../types/student-stats.js"
    );
    return this.request("/students/me/stats", {}, StudentStatsResponseSchema);
  }
}

export const thriveClient = new ThriveClient();
