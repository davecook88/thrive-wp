import { z } from "zod";

import { PublicTeacherSchema } from "./teachers.js";

export const AdminResponseSchema = z.object({
  id: z.number(),
  role: z.string(),
  isActive: z.union([z.boolean(), z.number()]).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AdminResponse = z.infer<typeof AdminResponseSchema>;

export const UserResponseSchema = z.object({
  id: z.number(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  admin: AdminResponseSchema.optional(),
  teacher: PublicTeacherSchema.optional(),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

export const PaginatedUsersResponseSchema = z.object({
  users: z.array(UserResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type PaginatedUsersResponse = z.infer<
  typeof PaginatedUsersResponseSchema
>;

// Admin action schemas
export const MakeAdminSchema = z.object({
  userId: z
    .number()
    .int()
    .positive({ message: "User ID must be a positive integer" }),
});

export type MakeAdminDto = z.infer<typeof MakeAdminSchema>;

export const MakeTeacherSchema = z.object({
  userId: z
    .number()
    .int()
    .positive({ message: "User ID must be a positive integer" }),
});

export type MakeTeacherDto = z.infer<typeof MakeTeacherSchema>;
