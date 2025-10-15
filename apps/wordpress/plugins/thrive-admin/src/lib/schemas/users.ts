import { z } from "zod";

// Zod schemas matching the backend DTOs
export const AdminResponseSchema = z.object({
  id: z.number(),
  role: z.string(),
  isActive: z
    .union([z.boolean(), z.number()])
    .transform((val: boolean | number) => Boolean(val)),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const TeacherResponseSchema = z.object({
  id: z.number(),
  tier: z.number(),
  bio: z.string().nullable(),
  isActive: z
    .union([z.boolean(), z.number()])
    .transform((val: boolean | number) => Boolean(val)),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const UserResponseSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  admin: AdminResponseSchema.optional(),
  teacher: TeacherResponseSchema.optional(),
});

export const PaginatedUsersResponseSchema = z.object({
  users: z.array(UserResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

// API Response wrapper schemas
export const ApiSuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
  });

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  data: z.object({
    message: z.string(),
    statusCode: z.number().optional(),
  }),
});

// Combined response schema
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.union([ApiSuccessResponseSchema(dataSchema), ApiErrorResponseSchema]);

// Type exports
export type AdminResponse = z.infer<typeof AdminResponseSchema>;
export type TeacherResponse = z.infer<typeof TeacherResponseSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type PaginatedUsersResponse = z.infer<
  typeof PaginatedUsersResponseSchema
>;
export type ApiResponse<T> = z.infer<
  ReturnType<typeof ApiResponseSchema<z.ZodType<T>>>
>;
