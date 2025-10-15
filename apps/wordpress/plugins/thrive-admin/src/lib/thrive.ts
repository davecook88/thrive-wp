import { apiClient } from "./api/client";
import { UsersApiService } from "./api/users";
import { PackagesApiService } from "./api/packages";

// Centralized Thrive API client
export class ThriveClient {
  private constructor() {}

  // Users API
  static users = UsersApiService;

  // Packages API
  static packages = PackagesApiService;

  // Direct access to the underlying client if needed
  static get client() {
    return apiClient;
  }
}

// Export singleton instance
export const thriveClient = ThriveClient;
