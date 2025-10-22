import { z } from "zod";

import { LocationInputSchema } from "./teachers.js";

export const AdminResponseSchema = z.object({
  id: z.number(),
  role: z.string(),
  isActive: z.union([z.boolean(), z.number()]).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AdminResponse = z.infer<typeof AdminResponseSchema>;

export const TeacherResponseSchema = z
  .object({
    id: z.number(),
    tier: z.number(),
    bio: z.string().nullable(),
    isActive: z.union([z.boolean(), z.number()]),
    avatarUrl: z.string().nullable(),
    birthplace: LocationInputSchema.nullable(),
    currentLocation: LocationInputSchema.nullable(),
    specialties: z.array(z.string()).nullable(),
    yearsExperience: z.number().nullable(),
    languagesSpoken: z.array(z.string()).nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export type TeacherResponse = z.infer<typeof TeacherResponseSchema>;

export const UserResponseSchema = z.object({
  id: z.number(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  admin: AdminResponseSchema.optional(),
  teacher: TeacherResponseSchema.optional(),
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
