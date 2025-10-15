import { apiClient } from "./client";
import {
  PackagesResponseSchema,
  PackageSchema,
  ApiResponseSchema,
} from "../schemas/packages";
import type {
  Package,
  PackagesResponse,
  CreatePackageData,
  ApiResponse,
} from "../types/packages";

// Packages API service
export class PackagesApiService {
  private static readonly BASE_ENDPOINT = "/admin/packages";

  static async getPackages(): Promise<PackagesResponse> {
    return apiClient.get<PackagesResponse>(
      this.BASE_ENDPOINT,
      undefined,
      PackagesResponseSchema,
    );
  }

  static async createPackage(packageData: CreatePackageData): Promise<Package> {
    return apiClient.post<Package>(
      this.BASE_ENDPOINT,
      packageData,
      PackageSchema,
    );
  }

  static async deactivatePackage(packageId: number): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(
      `${this.BASE_ENDPOINT}/${packageId}/deactivate`,
      undefined,
      ApiResponseSchema,
    );
  }
}
