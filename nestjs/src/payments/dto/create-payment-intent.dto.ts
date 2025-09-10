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
  serviceType: z.enum(ServiceType, {
    message: 'Service type must be PRIVATE, GROUP, or COURSE',
  }),
  notes: z.string().optional(),
});

export type CreatePaymentIntentDto = z.infer<typeof CreatePaymentIntentSchema>;
