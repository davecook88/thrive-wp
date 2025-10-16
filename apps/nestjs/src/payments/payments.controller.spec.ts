import { describe, it, expect } from "vitest";

import {
  CreatePaymentIntentDto,
  CreatePaymentIntentSchema,
} from "./dto/create-payment-intent.dto.js";
import { ServiceType } from "../common/types/class-types.js";

describe("CreatePaymentIntentDto validation", () => {
  it("should validate correct DTO", () => {
    const validDto: CreatePaymentIntentDto = {
      start: "2025-09-10T10:00:00.000Z",
      end: "2025-09-10T11:00:00.000Z",
      teacher: 1,
      serviceType: ServiceType.PRIVATE,
      notes: "Test booking",
    };

    const result = CreatePaymentIntentSchema.safeParse(validDto);
    expect(result.success).toBe(true);
  });

  it("should reject invalid service type", () => {
    const invalidDto = {
      start: "2025-09-10T10:00:00.000Z",
      end: "2025-09-10T11:00:00.000Z",
      teacher: 1,
      serviceType: "INVALID_TYPE",
      notes: "Test booking",
    };

    const result = CreatePaymentIntentSchema.safeParse(invalidDto);
    expect(result.success).toBe(false);
  });

  it("should reject invalid datetime format", () => {
    const invalidDto = {
      start: "invalid-date",
      end: "2025-09-10T11:00:00.000Z",
      teacher: 1,
      serviceType: ServiceType.PRIVATE,
      notes: "Test booking",
    };

    const result = CreatePaymentIntentSchema.safeParse(invalidDto);
    expect(result.success).toBe(false);
  });

  it("should reject negative teacher ID", () => {
    const invalidDto = {
      start: "2025-09-10T10:00:00.000Z",
      end: "2025-09-10T11:00:00.000Z",
      teacher: -1,
      serviceType: ServiceType.PRIVATE,
      notes: "Test booking",
    };

    const result = CreatePaymentIntentSchema.safeParse(invalidDto);
    expect(result.success).toBe(false);
  });

  it("should accept PRIVATE service type", () => {
    const dto = {
      start: "2025-09-10T10:00:00.000Z",
      end: "2025-09-10T11:00:00.000Z",
      teacher: 1,
      serviceType: ServiceType.PRIVATE,
    };

    const result = CreatePaymentIntentSchema.safeParse(dto);
    expect(result.success).toBe(true);
  });
});
