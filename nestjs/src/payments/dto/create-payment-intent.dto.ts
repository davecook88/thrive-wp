import { ServiceType } from '../../common/types/class-types.js';
import { z } from 'zod';

/**
 * Zod schema for validating CreatePaymentIntentDto.
 * Use this for runtime validation of payment intent creation requests.
 */
export const CreatePaymentIntentSchema = z.object({
  start: z.iso.datetime({
    message: 'Start must be a valid ISO datetime string',
  }),
  end: z.iso.datetime({ message: 'End must be a valid ISO datetime string' }),
  teacher: z
    .number()
    .int()
    .positive({ message: 'Teacher ID must be a positive integer' }),
  serviceType: z.nativeEnum(ServiceType, {
    message: 'Service type must be one of: PRIVATE, GROUP, COURSE',
  }),
  notes: z.string().optional(),
});

export type CreatePaymentIntentDto = z.infer<typeof CreatePaymentIntentSchema>;

export const CreateSessionBookingDataSchema = z.object({
  teacherId: z.number().int().positive(),
  start: z.iso.datetime(),
  end: z.iso.datetime(),
});

export const CreateSessionSchema = z.object({
  priceId: z.string().min(1, { message: 'Price ID is required' }),
  bookingData: CreateSessionBookingDataSchema,
});

export type CreateSessionDto = z.infer<typeof CreateSessionSchema>;
