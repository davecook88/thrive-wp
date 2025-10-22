// Main exports for the API library
export * from "./types/users";
export type {
  Package,
  PackagesResponse,
  CreatePackageData,
} from "./types/packages";
export {
  AdminResponseSchema,
  TeacherResponseSchema,
  UserResponseSchema,
  PaginatedUsersResponseSchema,
  ApiSuccessResponseSchema,
  ApiErrorResponseSchema,
  ApiResponseSchema,
} from "./schemas/users";
export {
  PackageSchema,
  PackagesResponseSchema,
  CreatePackageRequestSchema,
} from "./schemas/packages";

export * from "./utils/user-utils";
export * from "./composables/use-users";
