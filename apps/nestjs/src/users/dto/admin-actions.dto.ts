import { z } from "zod";

/**
 * Zod schema for validating MakeAdminDto.
 */
export const MakeAdminSchema = z.object({
  userId: z
    .number()
    .int()
    .positive({ message: "User ID must be a positive integer" }),
});

export type MakeAdminDto = z.infer<typeof MakeAdminSchema>;

/**
 * Zod schema for validating MakeTeacherDto.
 */
export const MakeTeacherSchema = z.object({
  userId: z
    .number()
    .int()
    .positive({ message: "User ID must be a positive integer" }),
});

export type MakeTeacherDto = z.infer<typeof MakeTeacherSchema>;
