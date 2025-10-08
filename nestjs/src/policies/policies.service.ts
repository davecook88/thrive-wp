import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CancellationPolicy } from './entities/cancellation-policy.entity.js';
import { z } from 'zod';

export const CreateCancellationPolicySchema = z.object({
  allowCancellation: z.boolean().default(true),
  cancellationDeadlineHours: z.number().int().min(1).max(168).default(24),
  allowRescheduling: z.boolean().default(true),
  reschedulingDeadlineHours: z.number().int().min(1).max(168).default(24),
  maxReschedulesPerBooking: z.number().int().min(0).max(10).default(2),
  refundCreditsOnCancel: z.boolean().default(true),
  policyName: z.string().optional(),
});

export type CreateCancellationPolicyDto = z.infer<
  typeof CreateCancellationPolicySchema
>;

@Injectable()
export class PoliciesService {
  constructor(
    @InjectRepository(CancellationPolicy)
    private readonly cancellationPolicyRepository: Repository<CancellationPolicy>,
  ) {}

  /**
   * Get the currently active cancellation policy
   */
  async getActivePolicy(): Promise<CancellationPolicy> {
    const policy = await this.cancellationPolicyRepository.findOne({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });

    if (!policy) {
      throw new NotFoundException('No active cancellation policy found');
    }

    return policy;
  }

  /**
   * Create or update the active cancellation policy
   * Deactivates all existing policies and creates a new active one
   */
  async setActivePolicy(
    dto: CreateCancellationPolicyDto,
  ): Promise<CancellationPolicy> {
    // Deactivate all existing policies
    await this.cancellationPolicyRepository.update(
      { isActive: true },
      { isActive: false },
    );

    // Create new active policy
    const newPolicy = this.cancellationPolicyRepository.create({
      ...dto,
      isActive: true,
    });

    return this.cancellationPolicyRepository.save(newPolicy);
  }

  /**
   * Get all policies (for admin management)
   */
  async getAllPolicies(): Promise<CancellationPolicy[]> {
    return this.cancellationPolicyRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
}
