import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard.js";
import { PoliciesService } from "./policies.service.js";
import type { CreateCancellationPolicyDto } from "./policies.service.js";

@Controller("policies")
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  /**
   * Get the currently active cancellation policy (public endpoint)
   */
  @Get("cancellation")
  async getActivePolicy() {
    const policy = await this.policiesService.getActivePolicy();
    return {
      allowCancellation: policy.allowCancellation,
      cancellationDeadlineHours: policy.cancellationDeadlineHours,
      allowRescheduling: policy.allowRescheduling,
      reschedulingDeadlineHours: policy.reschedulingDeadlineHours,
      maxReschedulesPerBooking: policy.maxReschedulesPerBooking,
      refundCreditsOnCancel: policy.refundCreditsOnCancel,
    };
  }

  /**
   * Create or update the active cancellation policy (admin only)
   */
  @Post("cancellation")
  @UseGuards(AdminGuard)
  async setActivePolicy(@Body() dto: CreateCancellationPolicyDto) {
    const policy = await this.policiesService.setActivePolicy(dto);
    return {
      id: policy.id,
      allowCancellation: policy.allowCancellation,
      cancellationDeadlineHours: policy.cancellationDeadlineHours,
      allowRescheduling: policy.allowRescheduling,
      reschedulingDeadlineHours: policy.reschedulingDeadlineHours,
      maxReschedulesPerBooking: policy.maxReschedulesPerBooking,
      refundCreditsOnCancel: policy.refundCreditsOnCancel,
      policyName: policy.policyName,
      createdAt: policy.createdAt,
    };
  }

  /**
   * Get all policies (admin only)
   */
  @Get("cancellation/all")
  @UseGuards(AdminGuard)
  async getAllPolicies() {
    return this.policiesService.getAllPolicies();
  }
}
