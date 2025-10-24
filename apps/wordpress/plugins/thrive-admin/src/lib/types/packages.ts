export type StudentPackage = {
  id: number;
  packageName: string;
  totalSessions: number;
  remainingSessions: number;
  purchasedAt: string; // ISO date string
  expiresAt: string | null; // ISO date string or null
};

// Admin package types
import { z } from "zod";
import type {
  PackageSchema,
  PackagesResponseSchema,
  CreatePackageRequestSchema,
  ApiResponseSchema,
} from "../schemas/packages";

// Types inferred from schemas
export type Package = z.infer<typeof PackageSchema>;
export type PackagesResponse = z.infer<typeof PackagesResponseSchema>;
export type CreatePackageRequest = z.infer<typeof CreatePackageRequestSchema>;
export type ApiResponse<T = unknown> = z.infer<typeof ApiResponseSchema> & {
  data?: T;
};

// API request/response types
export type CreatePackageData = {
  name: string;
  description?: string;
  credits: number;
  creditUnitMinutes: number;
  expiresInDays?: number;
  currency: string;
  amountMinor: number;
  lookupKey?: string;
  serviceType: string;
};
