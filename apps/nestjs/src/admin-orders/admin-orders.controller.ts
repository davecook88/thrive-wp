import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
} from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard.js";
import { AdminOrdersService } from "./admin-orders.service.js";
import {
  OrderStatus,
  type OrderFiltersDto,
  type RevenueReportQueryDto,
  type StudentPackageFiltersDto,
  type PaginatedOrdersResponse,
  type OrderDetailDto,
  type RefundResponseDto,
  type SalesDashboardMetricsDto,
  type RevenueReportResponseDto,
  type PaginatedStudentPackagesResponse,
  type StudentPackageAdminListItemDto,
} from "@thrive/shared";

/**
 * Admin endpoints for managing orders, sales, and student packages.
 * Base path: /admin/orders
 */
@Controller("admin/orders")
@UseGuards(AdminGuard)
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  /**
   * Get paginated list of all orders with optional filters.
   */
  @Get()
  async getOrders(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("search") search?: string,
  ): Promise<PaginatedOrdersResponse> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException("Invalid pagination parameters");
    }

    // Validate status if provided
    const validStatuses = Object.values(OrderStatus) as string[];
    if (status && !validStatuses.includes(status)) {
      throw new BadRequestException("Invalid status parameter");
    }

    const filters: OrderFiltersDto = {
      page: pageNum,
      limit: limitNum,
      status: status as (typeof OrderStatus)[keyof typeof OrderStatus],
      dateFrom,
      dateTo,
      search,
    };

    return this.adminOrdersService.getOrders(filters);
  }

  /**
   * Get a single order by ID with all details and items.
   */
  @Get(":id")
  async getOrder(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<OrderDetailDto> {
    return this.adminOrdersService.getOrderById(id);
  }

  /**
   * Initiate a refund for an order via Stripe.
   */
  @Post(":id/refund")
  async refundOrder(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { amount?: number; reason: string },
  ): Promise<RefundResponseDto> {
    if (!body.reason || body.reason.length === 0) {
      throw new BadRequestException("Reason is required");
    }
    if (body.reason.length > 500) {
      throw new BadRequestException("Reason must be 500 characters or less");
    }
    if (
      body.amount !== undefined &&
      (body.amount <= 0 || !Number.isInteger(body.amount))
    ) {
      throw new BadRequestException("Amount must be a positive integer");
    }
    return this.adminOrdersService.refundOrder(id, {
      amount: body.amount,
      reason: body.reason,
    });
  }
}

/**
 * Admin endpoints for sales dashboard and reports.
 * Base path: /admin/sales
 */
@Controller("admin/sales")
@UseGuards(AdminGuard)
export class AdminSalesController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  /**
   * Get sales dashboard metrics (revenue, packages, bookings).
   */
  @Get("dashboard")
  async getDashboardMetrics(): Promise<SalesDashboardMetricsDto> {
    return this.adminOrdersService.getSalesDashboardMetrics();
  }

  /**
   * Get revenue report with time-grouped data.
   */
  @Get("revenue-report")
  async getRevenueReport(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Query("groupBy") groupBy?: string,
    @Query("breakdown") breakdown?: string,
  ): Promise<RevenueReportResponseDto> {
    if (!startDate || !endDate) {
      throw new BadRequestException("startDate and endDate are required");
    }

    const validGroupBy = ["day", "week", "month"] as const;
    const validBreakdown = ["package", "teacher", "service_type"] as const;

    if (
      groupBy &&
      !validGroupBy.includes(groupBy as (typeof validGroupBy)[number])
    ) {
      throw new BadRequestException("Invalid groupBy parameter");
    }
    if (
      breakdown &&
      !validBreakdown.includes(breakdown as (typeof validBreakdown)[number])
    ) {
      throw new BadRequestException("Invalid breakdown parameter");
    }

    const query: RevenueReportQueryDto = {
      startDate,
      endDate,
      groupBy: (groupBy as (typeof validGroupBy)[number]) || "day",
      breakdown: breakdown as (typeof validBreakdown)[number],
    };

    return this.adminOrdersService.getRevenueReport(query);
  }
}

/**
 * Admin endpoints for managing student packages.
 * Base path: /admin/student-packages
 */
@Controller("admin/student-packages")
@UseGuards(AdminGuard)
export class AdminStudentPackagesController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  /**
   * Get paginated list of all student packages with optional filters.
   */
  @Get()
  async getStudentPackages(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("studentId") studentId?: string,
    @Query("active") active?: string,
    @Query("search") search?: string,
  ): Promise<PaginatedStudentPackagesResponse> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException("Invalid pagination parameters");
    }

    const studentIdNum = studentId ? parseInt(studentId, 10) : undefined;
    if (studentId && (isNaN(studentIdNum!) || studentIdNum! < 1)) {
      throw new BadRequestException("Invalid studentId parameter");
    }

    const filters: StudentPackageFiltersDto = {
      page: pageNum,
      limit: limitNum,
      studentId: studentIdNum,
      active: active === "true" ? true : active === "false" ? false : undefined,
      search,
    };

    return this.adminOrdersService.getStudentPackages(filters);
  }

  /**
   * Get a single student package by ID.
   */
  @Get(":id")
  async getStudentPackage(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<StudentPackageAdminListItemDto> {
    return this.adminOrdersService.getStudentPackageById(id);
  }

  /**
   * Adjust credits for a student package (grant or deduct).
   */
  @Post(":id/adjust-credits")
  async adjustCredits(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { creditDelta: number; reason: string; allowanceId?: number },
  ): Promise<StudentPackageAdminListItemDto> {
    if (!Number.isInteger(body.creditDelta)) {
      throw new BadRequestException("creditDelta must be an integer");
    }
    if (!body.reason || body.reason.length === 0) {
      throw new BadRequestException("Reason is required");
    }
    if (body.reason.length > 500) {
      throw new BadRequestException("Reason must be 500 characters or less");
    }

    return this.adminOrdersService.adjustPackageCredits(id, {
      creditDelta: body.creditDelta,
      reason: body.reason,
      allowanceId: body.allowanceId,
    });
  }

  /**
   * Extend the expiry date of a student package.
   */
  @Post(":id/extend")
  async extendPackage(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { newExpiryDate: string; reason: string },
  ): Promise<StudentPackageAdminListItemDto> {
    if (!body.newExpiryDate) {
      throw new BadRequestException("newExpiryDate is required");
    }
    if (!body.reason || body.reason.length === 0) {
      throw new BadRequestException("Reason is required");
    }
    if (body.reason.length > 500) {
      throw new BadRequestException("Reason must be 500 characters or less");
    }

    return this.adminOrdersService.extendPackage(id, {
      newExpiryDate: body.newExpiryDate,
      reason: body.reason,
    });
  }
}
