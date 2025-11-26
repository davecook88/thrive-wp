import { z } from "zod";

// ============== Order Status Enum ==============
export const OrderStatus = {
  PENDING: "pending",
  REQUIRES_PAYMENT: "requires_payment",
  PAID: "paid",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
  FAILED: "failed",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

// ============== Order Item Type Enum ==============
export const ItemType = {
  SESSION: "session",
  COURSE: "course",
  PACKAGE: "package",
  SERVICE: "service",
} as const;

export type ItemType = (typeof ItemType)[keyof typeof ItemType];

// ============== Order Item Schema ==============
export const OrderItemSchema = z.object({
  id: z.number(),
  itemType: z.nativeEnum(ItemType),
  itemRef: z.string(),
  title: z.string(),
  quantity: z.number(),
  amountMinor: z.number(),
  currency: z.string(),
  stripePriceId: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type OrderItemDto = z.infer<typeof OrderItemSchema>;

// ============== Order Schema (List View) ==============
export const OrderListItemSchema = z.object({
  id: z.number(),
  studentId: z.number(),
  studentName: z.string(),
  studentEmail: z.string(),
  status: z.nativeEnum(OrderStatus),
  currency: z.string(),
  subtotalMinor: z.number(),
  discountMinor: z.number(),
  taxMinor: z.number(),
  totalMinor: z.number(),
  stripePaymentIntentId: z.string().nullable().optional(),
  stripeCustomerId: z.string().nullable().optional(),
  createdAt: z.string(), // ISO datetime
  updatedAt: z.string(),
  itemCount: z.number(),
});

export type OrderListItemDto = z.infer<typeof OrderListItemSchema>;

// ============== Order Detail Schema ==============
export const OrderDetailSchema = OrderListItemSchema.extend({
  items: z.array(OrderItemSchema),
});

export type OrderDetailDto = z.infer<typeof OrderDetailSchema>;

// ============== Paginated Orders Response ==============
export const PaginatedOrdersResponseSchema = z.object({
  data: z.array(OrderListItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type PaginatedOrdersResponse = z.infer<
  typeof PaginatedOrdersResponseSchema
>;

// ============== Order Filters Schema ==============
export const OrderFiltersSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.nativeEnum(OrderStatus).optional(),
  dateFrom: z.string().optional(), // ISO date
  dateTo: z.string().optional(), // ISO date
  search: z.string().optional(), // Search by student name/email or order ID
});

export type OrderFiltersDto = z.infer<typeof OrderFiltersSchema>;

// ============== Refund Request Schema ==============
export const RefundRequestSchema = z.object({
  amount: z.number().int().positive().optional(), // Optional partial refund amount in minor units
  reason: z.string().min(1).max(500),
});

export type RefundRequestDto = z.infer<typeof RefundRequestSchema>;

// ============== Refund Response Schema ==============
export const RefundResponseSchema = z.object({
  success: z.boolean(),
  refundId: z.string().optional(),
  amountRefunded: z.number(),
  currency: z.string(),
  status: z.string(),
});

export type RefundResponseDto = z.infer<typeof RefundResponseSchema>;

// ============== Sales Dashboard Metrics ==============
export const SalesDashboardMetricsSchema = z.object({
  todayRevenue: z.number(),
  weekRevenue: z.number(),
  monthRevenue: z.number(),
  yearRevenue: z.number(),
  currency: z.string(),
  previousPeriodComparison: z.object({
    weekChange: z.number(), // percentage change
    monthChange: z.number(),
  }),
  activeStudentPackages: z.number(),
  totalBookingsThisMonth: z.number(),
  cancellationRate: z.number(), // percentage
  recentTransactions: z.array(
    z.object({
      id: z.number(),
      studentName: z.string(),
      amount: z.number(),
      currency: z.string(),
      type: z.string(),
      createdAt: z.string(),
    }),
  ),
});

export type SalesDashboardMetricsDto = z.infer<
  typeof SalesDashboardMetricsSchema
>;

// ============== Revenue Report Schema ==============
export const RevenueReportQuerySchema = z.object({
  startDate: z.string(), // ISO date
  endDate: z.string(), // ISO date
  groupBy: z.enum(["day", "week", "month"]).optional().default("day"),
  breakdown: z.enum(["package", "teacher", "service_type"]).optional(),
});

export type RevenueReportQueryDto = z.infer<typeof RevenueReportQuerySchema>;

export const RevenueDataPointSchema = z.object({
  date: z.string(),
  revenue: z.number(),
  orderCount: z.number(),
});

export type RevenueDataPointDto = z.infer<typeof RevenueDataPointSchema>;

export const RevenueReportResponseSchema = z.object({
  data: z.array(RevenueDataPointSchema),
  totalRevenue: z.number(),
  totalOrders: z.number(),
  currency: z.string(),
  breakdown: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        revenue: z.number(),
        percentage: z.number(),
      }),
    )
    .optional(),
});

export type RevenueReportResponseDto = z.infer<
  typeof RevenueReportResponseSchema
>;

// ============== Student Packages Admin ==============
export const StudentPackageAdminListItemSchema = z.object({
  id: z.number(),
  studentId: z.number(),
  studentName: z.string(),
  studentEmail: z.string(),
  packageName: z.string(),
  totalCredits: z.number(),
  usedCredits: z.number(),
  remainingCredits: z.number(),
  purchasedAt: z.string(),
  expiresAt: z.string().nullable(),
  isExpired: z.boolean(),
  isActive: z.boolean(),
  sourcePaymentId: z.string().nullable(),
});

export type StudentPackageAdminListItemDto = z.infer<
  typeof StudentPackageAdminListItemSchema
>;

export const PaginatedStudentPackagesResponseSchema = z.object({
  data: z.array(StudentPackageAdminListItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type PaginatedStudentPackagesResponse = z.infer<
  typeof PaginatedStudentPackagesResponseSchema
>;

export const StudentPackageFiltersSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  studentId: z.coerce.number().int().positive().optional(),
  active: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export type StudentPackageFiltersDto = z.infer<
  typeof StudentPackageFiltersSchema
>;

// ============== Credit Adjustment Schema ==============
export const CreditAdjustmentSchema = z.object({
  allowanceId: z.number().int().positive().optional(),
  creditDelta: z.number().int(), // Can be positive (grant) or negative (deduct)
  reason: z.string().min(1).max(500),
});

export type CreditAdjustmentDto = z.infer<typeof CreditAdjustmentSchema>;

export const ExtendPackageSchema = z.object({
  newExpiryDate: z.string(), // ISO datetime
  reason: z.string().min(1).max(500),
});

export type ExtendPackageDto = z.infer<typeof ExtendPackageSchema>;
