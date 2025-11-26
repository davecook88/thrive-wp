import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository, InjectDataSource } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { Order, OrderStatus } from "../payments/entities/order.entity.js";
import { OrderItem } from "../payments/entities/order-item.entity.js";
import { Student } from "../students/entities/student.entity.js";
import { Booking, BookingStatus } from "../payments/entities/booking.entity.js";
import { StudentPackage } from "../packages/entities/student-package.entity.js";
import { PackageUse } from "../packages/entities/package-use.entity.js";
import type {
  OrderFiltersDto,
  PaginatedOrdersResponse,
  OrderListItemDto,
  OrderDetailDto,
  RefundRequestDto,
  RefundResponseDto,
  SalesDashboardMetricsDto,
  RevenueReportQueryDto,
  RevenueReportResponseDto,
  RevenueDataPointDto,
  PaginatedStudentPackagesResponse,
  StudentPackageFiltersDto,
  StudentPackageAdminListItemDto,
  CreditAdjustmentDto,
  ExtendPackageDto,
} from "@thrive/shared";

@Injectable()
export class AdminOrdersService {
  private stripe: Stripe;
  private readonly logger = new Logger(AdminOrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(StudentPackage)
    private readonly studentPackageRepo: Repository<StudentPackage>,
    @InjectRepository(PackageUse)
    private readonly packageUseRepo: Repository<PackageUse>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>("stripe.secretKey");
    if (!secretKey) {
      throw new Error("Stripe secret key is not configured");
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil",
    });
  }

  // ==================== Orders ====================

  async getOrders(filters: OrderFiltersDto): Promise<PaginatedOrdersResponse> {
    const { page = 1, limit = 20, status, dateFrom, dateTo, search } = filters;
    const skip = (page - 1) * limit;

    const qb = this.orderRepo
      .createQueryBuilder("o")
      .leftJoin("o.student", "s")
      .leftJoin("s.user", "u")
      .select([
        "o.id",
        "o.studentId",
        "o.status",
        "o.currency",
        "o.subtotalMinor",
        "o.discountMinor",
        "o.taxMinor",
        "o.totalMinor",
        "o.stripePaymentIntentId",
        "o.stripeCustomerId",
        "o.createdAt",
        "o.updatedAt",
        "s.id",
        "u.firstName",
        "u.lastName",
        "u.email",
      ])
      .loadRelationCountAndMap("o.itemCount", "o.items");

    // Apply filters
    if (status) {
      qb.andWhere("o.status = :status", { status });
    }

    if (dateFrom) {
      qb.andWhere("o.createdAt >= :dateFrom", {
        dateFrom: new Date(dateFrom),
      });
    }

    if (dateTo) {
      qb.andWhere("o.createdAt <= :dateTo", {
        dateTo: new Date(dateTo),
      });
    }

    if (search) {
      const searchTerm = `%${search}%`;
      qb.andWhere(
        "(u.firstName LIKE :search OR u.lastName LIKE :search OR u.email LIKE :search OR CAST(o.id AS CHAR) LIKE :search)",
        { search: searchTerm },
      );
    }

    // Get total count
    const total = await qb.getCount();

    // Get paginated results
    const orders = await qb
      .orderBy("o.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getMany();

    const data: OrderListItemDto[] = orders.map((order) => ({
      id: order.id,
      studentId: order.studentId,
      studentName: order.student?.user
        ? `${order.student.user.firstName} ${order.student.user.lastName}`
        : "Unknown",
      studentEmail: order.student?.user?.email || "Unknown",
      status: order.status,
      currency: order.currency,
      subtotalMinor: order.subtotalMinor,
      discountMinor: order.discountMinor,
      taxMinor: order.taxMinor,
      totalMinor: order.totalMinor,
      stripePaymentIntentId: order.stripePaymentIntentId,
      stripeCustomerId: order.stripeCustomerId,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      itemCount: (order as Order & { itemCount: number }).itemCount || 0,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrderById(id: number): Promise<OrderDetailDto> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ["student", "student.user", "items"],
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    return {
      id: order.id,
      studentId: order.studentId,
      studentName: order.student?.user
        ? `${order.student.user.firstName} ${order.student.user.lastName}`
        : "Unknown",
      studentEmail: order.student?.user?.email || "Unknown",
      status: order.status,
      currency: order.currency,
      subtotalMinor: order.subtotalMinor,
      discountMinor: order.discountMinor,
      taxMinor: order.taxMinor,
      totalMinor: order.totalMinor,
      stripePaymentIntentId: order.stripePaymentIntentId,
      stripeCustomerId: order.stripeCustomerId,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      itemCount: order.items?.length || 0,
      items: (order.items || []).map((item) => ({
        id: item.id,
        itemType: item.itemType,
        itemRef: item.itemRef,
        title: item.title,
        quantity: item.quantity,
        amountMinor: item.amountMinor,
        currency: item.currency,
        stripePriceId: item.stripePriceId,
        metadata: item.metadata,
      })),
    };
  }

  async refundOrder(
    id: number,
    dto: RefundRequestDto,
  ): Promise<RefundResponseDto> {
    const order = await this.orderRepo.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    if (!order.stripePaymentIntentId) {
      throw new NotFoundException(`Order ${id} has no Stripe payment intent`);
    }

    if (order.status !== OrderStatus.PAID) {
      throw new NotFoundException(
        `Order ${id} is not in PAID status (current: ${order.status})`,
      );
    }

    try {
      // Create Stripe refund
      const refund = await this.stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId,
        amount: dto.amount, // Optional partial refund
        reason: "requested_by_customer",
        metadata: {
          admin_reason: dto.reason,
          order_id: String(order.id),
        },
      });

      // Update order status
      if (!dto.amount || dto.amount >= order.totalMinor) {
        order.status = OrderStatus.REFUNDED;
        await this.orderRepo.save(order);
      }

      this.logger.log(
        `Refund ${refund.id} created for order ${id}: ${refund.amount} ${refund.currency}`,
      );

      return {
        success: true,
        refundId: refund.id,
        amountRefunded: refund.amount,
        currency: refund.currency,
        status: refund.status ?? "succeeded",
      };
    } catch (error) {
      this.logger.error(`Failed to refund order ${id}:`, error);
      throw error;
    }
  }

  // ==================== Dashboard Metrics ====================

  async getSalesDashboardMetrics(): Promise<SalesDashboardMetricsDto> {
    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay());
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

    // Previous periods for comparison
    const startOfPrevWeek = new Date(startOfWeek);
    startOfPrevWeek.setUTCDate(startOfPrevWeek.getUTCDate() - 7);
    const startOfPrevMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
    );

    // Fetch revenue metrics
    const [
      todayRevenue,
      weekRevenue,
      monthRevenue,
      yearRevenue,
      prevWeekRevenue,
      prevMonthRevenue,
    ] = await Promise.all([
      this.getRevenueForPeriod(startOfToday, now),
      this.getRevenueForPeriod(startOfWeek, now),
      this.getRevenueForPeriod(startOfMonth, now),
      this.getRevenueForPeriod(startOfYear, now),
      this.getRevenueForPeriod(startOfPrevWeek, startOfWeek),
      this.getRevenueForPeriod(startOfPrevMonth, startOfMonth),
    ]);

    // Calculate percentage changes
    const weekChange =
      prevWeekRevenue > 0
        ? ((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100
        : weekRevenue > 0
          ? 100
          : 0;
    const monthChange =
      prevMonthRevenue > 0
        ? ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
        : monthRevenue > 0
          ? 100
          : 0;

    // Active student packages (not expired)
    const activeStudentPackages = await this.studentPackageRepo
      .createQueryBuilder("sp")
      .where("sp.expiresAt IS NULL OR sp.expiresAt > :now", { now })
      .getCount();

    // Total bookings this month
    const totalBookingsThisMonth = await this.bookingRepo
      .createQueryBuilder("b")
      .where("b.createdAt >= :startOfMonth", { startOfMonth })
      .getCount();

    // Cancellation rate this month
    const cancelledBookingsThisMonth = await this.bookingRepo
      .createQueryBuilder("b")
      .where("b.createdAt >= :startOfMonth", { startOfMonth })
      .andWhere("b.status = :status", { status: BookingStatus.CANCELLED })
      .getCount();

    const cancellationRate =
      totalBookingsThisMonth > 0
        ? (cancelledBookingsThisMonth / totalBookingsThisMonth) * 100
        : 0;

    // Recent transactions (last 5 paid orders)
    const recentOrders = await this.orderRepo.find({
      where: { status: OrderStatus.PAID },
      relations: ["student", "student.user"],
      order: { createdAt: "DESC" },
      take: 5,
    });

    const recentTransactions = recentOrders.map((order) => ({
      id: order.id,
      studentName: order.student?.user
        ? `${order.student.user.firstName} ${order.student.user.lastName}`
        : "Unknown",
      amount: order.totalMinor,
      currency: order.currency,
      type: "order",
      createdAt: order.createdAt.toISOString(),
    }));

    return {
      todayRevenue,
      weekRevenue,
      monthRevenue,
      yearRevenue,
      currency: "USD", // Default currency
      previousPeriodComparison: {
        weekChange: Math.round(weekChange * 10) / 10,
        monthChange: Math.round(monthChange * 10) / 10,
      },
      activeStudentPackages,
      totalBookingsThisMonth,
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      recentTransactions,
    };
  }

  private async getRevenueForPeriod(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.orderRepo
      .createQueryBuilder("o")
      .select("COALESCE(SUM(o.totalMinor), 0)", "total")
      .where("o.status = :status", { status: OrderStatus.PAID })
      .andWhere("o.createdAt >= :startDate", { startDate })
      .andWhere("o.createdAt < :endDate", { endDate })
      .getRawOne();

    return parseInt(result?.total || "0", 10);
  }

  // ==================== Revenue Reports ====================

  async getRevenueReport(
    query: RevenueReportQueryDto,
  ): Promise<RevenueReportResponseDto> {
    const { startDate, endDate, groupBy = "day" } = query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    // Get time-grouped revenue data
    let dateFormat: string;
    switch (groupBy) {
      case "week":
        dateFormat = "%Y-%u"; // Year-Week
        break;
      case "month":
        dateFormat = "%Y-%m"; // Year-Month
        break;
      default:
        dateFormat = "%Y-%m-%d"; // Year-Month-Day
    }

    const rawData = await this.orderRepo
      .createQueryBuilder("o")
      .select(`DATE_FORMAT(o.createdAt, '${dateFormat}')`, "date")
      .addSelect("SUM(o.totalMinor)", "revenue")
      .addSelect("COUNT(o.id)", "orderCount")
      .where("o.status = :status", { status: OrderStatus.PAID })
      .andWhere("o.createdAt >= :start", { start })
      .andWhere("o.createdAt <= :end", { end })
      .groupBy("date")
      .orderBy("date", "ASC")
      .getRawMany();

    const data: RevenueDataPointDto[] = rawData.map((row) => ({
      date: row.date,
      revenue: parseInt(row.revenue || "0", 10),
      orderCount: parseInt(row.orderCount || "0", 10),
    }));

    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = data.reduce((sum, d) => sum + d.orderCount, 0);

    return {
      data,
      totalRevenue,
      totalOrders,
      currency: "USD",
    };
  }

  // ==================== Student Packages ====================

  async getStudentPackages(
    filters: StudentPackageFiltersDto,
  ): Promise<PaginatedStudentPackagesResponse> {
    const { page = 1, limit = 20, studentId, active, search } = filters;
    const skip = (page - 1) * limit;
    const now = new Date();

    const qb = this.studentPackageRepo
      .createQueryBuilder("sp")
      .leftJoin("sp.student", "s")
      .leftJoin("s.user", "u")
      .leftJoinAndSelect("sp.uses", "pu")
      .select([
        "sp.id",
        "sp.studentId",
        "sp.packageName",
        "sp.totalSessions",
        "sp.purchasedAt",
        "sp.expiresAt",
        "sp.sourcePaymentId",
        "s.id",
        "u.firstName",
        "u.lastName",
        "u.email",
      ]);

    // Apply filters
    if (studentId) {
      qb.andWhere("sp.studentId = :studentId", { studentId });
    }

    if (active === true) {
      qb.andWhere("(sp.expiresAt IS NULL OR sp.expiresAt > :now)", { now });
    } else if (active === false) {
      qb.andWhere("sp.expiresAt IS NOT NULL AND sp.expiresAt <= :now", { now });
    }

    if (search) {
      const searchTerm = `%${search}%`;
      qb.andWhere(
        "(u.firstName LIKE :search OR u.lastName LIKE :search OR u.email LIKE :search OR sp.packageName LIKE :search)",
        { search: searchTerm },
      );
    }

    const total = await qb.getCount();

    const packages = await qb
      .orderBy("sp.purchasedAt", "DESC")
      .skip(skip)
      .take(limit)
      .getMany();

    const data: StudentPackageAdminListItemDto[] = packages.map((pkg) => {
      const usedCredits = (pkg.uses || []).reduce(
        (sum, use) => sum + (use.creditsUsed || 1),
        0,
      );
      const remainingCredits = Math.max(0, pkg.totalSessions - usedCredits);
      const isExpired = pkg.expiresAt ? pkg.expiresAt <= now : false;

      return {
        id: pkg.id,
        studentId: pkg.studentId,
        studentName: pkg.student?.user
          ? `${pkg.student.user.firstName} ${pkg.student.user.lastName}`
          : "Unknown",
        studentEmail: pkg.student?.user?.email || "Unknown",
        packageName: pkg.packageName,
        totalCredits: pkg.totalSessions,
        usedCredits,
        remainingCredits,
        purchasedAt: pkg.purchasedAt.toISOString(),
        expiresAt: pkg.expiresAt?.toISOString() || null,
        isExpired,
        isActive: !isExpired && remainingCredits > 0,
        sourcePaymentId: pkg.sourcePaymentId,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStudentPackageById(
    id: number,
  ): Promise<StudentPackageAdminListItemDto> {
    const pkg = await this.studentPackageRepo.findOne({
      where: { id },
      relations: ["student", "student.user", "uses"],
    });

    if (!pkg) {
      throw new NotFoundException(`Student package ${id} not found`);
    }

    const now = new Date();
    const usedCredits = (pkg.uses || []).reduce(
      (sum, use) => sum + (use.creditsUsed || 1),
      0,
    );
    const remainingCredits = Math.max(0, pkg.totalSessions - usedCredits);
    const isExpired = pkg.expiresAt ? pkg.expiresAt <= now : false;

    return {
      id: pkg.id,
      studentId: pkg.studentId,
      studentName: pkg.student?.user
        ? `${pkg.student.user.firstName} ${pkg.student.user.lastName}`
        : "Unknown",
      studentEmail: pkg.student?.user?.email || "Unknown",
      packageName: pkg.packageName,
      totalCredits: pkg.totalSessions,
      usedCredits,
      remainingCredits,
      purchasedAt: pkg.purchasedAt.toISOString(),
      expiresAt: pkg.expiresAt?.toISOString() || null,
      isExpired,
      isActive: !isExpired && remainingCredits > 0,
      sourcePaymentId: pkg.sourcePaymentId,
    };
  }

  async adjustPackageCredits(
    id: number,
    dto: CreditAdjustmentDto,
  ): Promise<StudentPackageAdminListItemDto> {
    const pkg = await this.studentPackageRepo.findOne({
      where: { id },
      relations: ["student", "student.user", "uses"],
    });

    if (!pkg) {
      throw new NotFoundException(`Student package ${id} not found`);
    }

    // Update total credits
    pkg.totalSessions = Math.max(0, pkg.totalSessions + dto.creditDelta);
    await this.studentPackageRepo.save(pkg);

    this.logger.log(
      `Adjusted package ${id} credits by ${dto.creditDelta}. Reason: ${dto.reason}`,
    );

    return this.getStudentPackageById(id);
  }

  async extendPackage(
    id: number,
    dto: ExtendPackageDto,
  ): Promise<StudentPackageAdminListItemDto> {
    const pkg = await this.studentPackageRepo.findOne({
      where: { id },
    });

    if (!pkg) {
      throw new NotFoundException(`Student package ${id} not found`);
    }

    pkg.expiresAt = new Date(dto.newExpiryDate);
    await this.studentPackageRepo.save(pkg);

    this.logger.log(
      `Extended package ${id} expiry to ${dto.newExpiryDate}. Reason: ${dto.reason}`,
    );

    return this.getStudentPackageById(id);
  }
}
