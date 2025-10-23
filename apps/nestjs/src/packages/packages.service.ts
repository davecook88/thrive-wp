import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import type { CreatePackageDto } from "@thrive/shared";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import Stripe from "stripe";
import {
  PackageResponseDto,
  CompatiblePackagesForSessionResponseDto,
  CompatiblePackage,
  CompatiblePackageWithWarning,
  ServiceType,
} from "@thrive/shared";
import {
  StripeProductMap,
  ScopeType,
} from "../payments/entities/stripe-product-map.entity.js";
import { StudentPackage } from "./entities/student-package.entity.js";
import { PackageUse } from "./entities/package-use.entity.js";
import { PackageAllowance } from "./entities/package-allowance.entity.js";
import { Student } from "../students/entities/student.entity.js";
import {
  Session,
  SessionStatus,
  SessionVisibility,
} from "../sessions/entities/session.entity.js";
import { Booking, BookingStatus } from "../payments/entities/booking.entity.js";
import { SessionsService } from "../sessions/services/sessions.service.js";
import {
  computeRemainingCredits,
  generateBundleDescription,
  validateAllowances,
} from "./utils/bundle-helpers.js";
import { PackageQueryBuilder } from "./utils/package-query-builder.js";
// import {
//   getSessionTier,
//   SERVICE_TYPE_BASE_TIERS,
// } from "../common/types/credit-tiers.js";

import {
  canUsePackageForSession,
  getPackageTier,
  getSessionTier,
  getPackageDisplayLabel,
  getCrossTierWarningMessage,
} from "../common/types/credit-tiers.js";

@Injectable()
export class PackagesService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(StripeProductMap)
    private stripeProductMapRepository: Repository<StripeProductMap>,
    private configService: ConfigService,
    @InjectRepository(StudentPackage)
    private readonly pkgRepo: Repository<StudentPackage>,
    @InjectRepository(PackageUse)
    private readonly useRepo: Repository<PackageUse>,
    @InjectRepository(PackageAllowance)
    private readonly allowanceRepo: Repository<PackageAllowance>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly sessionsService: SessionsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    const secretKey = this.configService.get<string>("stripe.secretKey");
    if (!secretKey) {
      throw new Error("Stripe secret key is not configured");
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil",
    });
  }

  /**
   * Build a PackageResponseDto from StripeProductMap and Stripe API data.
   * Handles both singular fetch and batch processing.
   */
  private buildPackageResponse(
    mapping: StripeProductMap,
    stripeProduct: Stripe.Product,
    stripePrice: Stripe.Price,
  ): PackageResponseDto {
    const metadata = mapping.metadata || {};
    const allowances = mapping.allowances || [];
    const bundleDescription =
      String(metadata.bundle_description) ||
      generateBundleDescription(allowances);

    return {
      id: mapping.id,
      name: String(metadata.name) || stripeProduct.name,
      bundleDescription,
      allowances,
      expiresInDays: metadata.expires_in_days
        ? Number(metadata.expires_in_days)
        : null,
      stripe: {
        productId: stripeProduct.id,
        priceId: stripePrice.id,
        lookupKey: stripePrice.lookup_key || mapping.serviceKey,
        unitAmount: stripePrice.unit_amount || 0,
        currency: stripePrice.currency || "usd",
      },
      active: mapping.active && stripeProduct.active,
    };
  }

  /**
   * Build multiple package responses. Reuses Stripe fetches.
   */
  private async buildPackageResponses(
    mappings: StripeProductMap[],
  ): Promise<PackageResponseDto[]> {
    const packages: PackageResponseDto[] = [];

    for (const mapping of mappings) {
      try {
        const stripeProduct = await this.stripe.products.retrieve(
          mapping.stripeProductId,
        );

        if (!stripeProduct.active) continue;

        const prices = await this.stripe.prices.list({
          product: mapping.stripeProductId,
          active: true,
          limit: 1,
        });

        if (prices.data.length === 0) continue;

        const stripePrice = prices.data[0];
        const response = this.buildPackageResponse(
          mapping,
          stripeProduct,
          stripePrice,
        );
        packages.push(response);
      } catch (error) {
        console.warn(
          `Failed to fetch Stripe data for mapping ${mapping.id}:`,
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }

    return packages;
  }

  async getPackages(): Promise<PackageResponseDto[]> {
    const mappings = await PackageQueryBuilder.buildPackageMappingQuery(
      this.stripeProductMapRepository,
    )
      .orderBy("spm.created_at", "DESC")
      .getMany();

    return this.buildPackageResponses(mappings);
  }

  async getActivePackages(): Promise<PackageResponseDto[]> {
    const mappings = await PackageQueryBuilder.buildActivePackageMappingQuery(
      this.stripeProductMapRepository,
    )
      .orderBy("spm.created_at", "DESC")
      .getMany();

    return this.buildPackageResponses(mappings);
  }

  async getPackagesByServiceType(
    serviceType: ServiceType,
  ): Promise<PackageResponseDto[]> {
    const mappings = await PackageQueryBuilder.buildPackageMappingQuery(
      this.stripeProductMapRepository,
    )
      .andWhere("spm.metadata ->> 'service_type' = :serviceType", {
        serviceType,
      })
      .orderBy("spm.created_at", "DESC")
      .getMany();

    return this.buildPackageResponses(mappings);
  }

  async getValidPackagesForSession(
    sessionId: number,
  ): Promise<PackageResponseDto[]> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ["teacher"],
    });

    if (!session) {
      throw new NotFoundException("Session not found");
    }

    // Query packages with allowances matching the session type
    const validMappings =
      await PackageQueryBuilder.buildPackagesForSessionTypeQuery(
        this.stripeProductMapRepository,
        session.type,
      )
        .orderBy("spm.created_at", "DESC")
        .getMany();

    // Remove duplicates (one row per allowance)
    const uniqueMappings = Array.from(
      new Map(validMappings.map((m) => [m.id, m])).values(),
    );

    return this.buildPackageResponses(uniqueMappings);
  }

  async getPackage(id: number): Promise<PackageResponseDto> {
    const mapping = await this.stripeProductMapRepository.findOne({
      where: {
        id,
        scopeType: ScopeType.PACKAGE,
      },
      relations: ["allowances"],
    });

    if (!mapping) {
      throw new NotFoundException("Package not found");
    }

    try {
      const stripeProduct = await this.stripe.products.retrieve(
        mapping.stripeProductId,
      );
      const prices = await this.stripe.prices.list({
        product: mapping.stripeProductId,
        active: true,
        limit: 1,
      });

      if (prices.data.length === 0) {
        throw new NotFoundException("No active price found for package");
      }

      return this.buildPackageResponse(mapping, stripeProduct, prices.data[0]);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error
          ? `Failed to fetch package: ${error.message}`
          : "Unknown error",
      );
    }
  }

  async deactivatePackage(id: number): Promise<void> {
    const mapping = await this.stripeProductMapRepository.findOne({
      where: {
        id,
        scopeType: ScopeType.PACKAGE,
      },
    });

    if (!mapping) {
      throw new NotFoundException("Package not found");
    }

    // Deactivate in our database (we don't delete Stripe products)
    mapping.active = false;
    await this.stripeProductMapRepository.save(mapping);
  }

  /**
   * Generate a lookup key for Stripe prices if one is not provided.
   */
  generateLookupKey(dto: CreatePackageDto): string {
    // Use bundle description to generate key
    const bundleDesc = generateBundleDescription(dto.allowances)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    return `pkg_${bundleDesc}_${Date.now()}`;
  }

  /**
   * Create a new package: create Stripe product & price, then local mapping.
   */
  async createPackage(dto: CreatePackageDto): Promise<PackageResponseDto> {
    try {
      // Validate allowances
      const validation = validateAllowances(dto.allowances);
      if (!validation.valid) {
        throw new BadRequestException(validation.errors.join(", "));
      }

      const lookupKey = dto.lookupKey || this.generateLookupKey(dto);

      // Check uniqueness
      const existing = await this.stripeProductMapRepository.findOne({
        where: { serviceKey: lookupKey },
      });
      if (existing) {
        throw new BadRequestException(
          `Lookup key "${lookupKey}" already exists`,
        );
      }

      // Create Stripe product for entire bundle
      const stripeProduct = await this.stripe.products.create({
        name: dto.name,
        description: dto.description,
        type: "service",
        metadata: {
          name: dto.name,
          allowances: JSON.stringify(dto.allowances),
          expires_in_days: dto.expiresInDays || "",
          scope: dto.scope,
        },
      });

      // Create Stripe price
      const stripePrice = await this.stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: dto.amountMinor,
        currency: dto.currency.toLowerCase(),
        lookup_key: lookupKey,
        metadata: {
          allowances: JSON.stringify(dto.allowances),
        },
      });

      // Create local mapping
      const mapping = this.stripeProductMapRepository.create({
        serviceKey: lookupKey,
        stripeProductId: stripeProduct.id,
        active: true,
        scopeType: ScopeType.PACKAGE,
        metadata: {
          name: dto.name,
          bundle_description:
            dto.bundleDescription || generateBundleDescription(dto.allowances),
        },
      });

      const savedMapping = await this.stripeProductMapRepository.save(mapping);

      // Create PackageAllowance rows
      const allowances = dto.allowances.map((a) =>
        this.allowanceRepo.create({
          stripeProductMapId: savedMapping.id,
          ...a,
        }),
      );
      await this.allowanceRepo.save(allowances);

      // Reload with allowances
      savedMapping.allowances = allowances;

      return this.buildPackageResponse(
        savedMapping,
        stripeProduct,
        stripePrice,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Handle Stripe errors
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(`Stripe error: ${error.message}`);
      }
      throw new BadRequestException(
        `Failed to create package: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // NEW CREDIT-BASED METHODS (added alongside)
  async getActivePackagesForStudent(studentId: number) {
    const packages = await PackageQueryBuilder.buildActiveStudentPackagesQuery(
      this.pkgRepo,
      studentId,
    )
      .orderBy("sp.created_at", "DESC")
      .getMany();

    // Compute remaining for each package
    const withRemaining = packages.map((pkg) => ({
      ...pkg,
      remainingSessions: computeRemainingCredits(
        pkg.totalSessions,
        pkg.uses || [],
      ),
      creditUnitMinutes: Number(pkg.metadata?.credit_unit_minutes) || 30,
      teacherTier: pkg.metadata?.teacher_tier || null,
      serviceType: pkg.metadata?.service_type || null,
    }));

    // Filter out packages with no remaining sessions
    const activePackages = withRemaining.filter(
      (pkg) => pkg.remainingSessions > 0,
    );

    const totalRemaining = activePackages.reduce(
      (sum, pkg) => sum + pkg.remainingSessions,
      0,
    );

    return {
      packages: activePackages,
      totalRemaining,
    };
  }

  async usePackageForSession(
    studentId: number,
    packageId: number,
    sessionId: number,
    options?: {
      serviceType?: ServiceType;
      creditsUsed?: number;
      usedBy?: number;
    },
  ): Promise<{ package: StudentPackage; use: PackageUse }> {
    const { serviceType, creditsUsed = 1, usedBy } = options || {};

    // Load with uses for balance computation (pessimistic lock)
    const pkg = await PackageQueryBuilder.buildStudentPackageWithUsesQuery(
      this.pkgRepo,
      studentId,
      packageId,
    )
      .setLock("pessimistic_write")
      .getOne();

    if (!pkg) {
      throw new NotFoundException("Package not found");
    }

    // Compute remaining credits
    const remaining = computeRemainingCredits(
      pkg.totalSessions,
      pkg.uses || [],
    );

    if (remaining < creditsUsed) {
      throw new BadRequestException("Insufficient credits");
    }

    // Check expiration
    if (pkg.expiresAt && new Date(pkg.expiresAt) < new Date()) {
      throw new BadRequestException("Package has expired");
    }

    // Create use record
    const use = this.useRepo.create({
      studentPackageId: packageId,
      sessionId,
      serviceType,
      creditsUsed,
      usedAt: new Date(),
      usedBy,
    });

    await this.useRepo.save(use);

    // Reload to verify
    const updated = await PackageQueryBuilder.buildStudentPackageWithUsesQuery(
      this.pkgRepo,
      studentId,
      packageId,
    ).getOne();

    return { package: updated!, use };
  }

  async linkUseToBooking(useId: number, bookingId: number) {
    const use = await this.useRepo.findOne({ where: { id: useId } });
    if (!use) return null;
    use.bookingId = bookingId;
    return await this.useRepo.save(use);
  }

  /**
   * Create a session from booking data and immediately book it with a package credit.
   * This is used when booking an availability slot (which has no existing session).
   */
  async createAndBookSession(
    userId: number,
    packageId: number,
    bookingData: { teacherId: number; startAt: string; endAt: string },
  ) {
    // Resolve student.id from userId
    const student = await this.studentRepo.findOne({
      where: { userId },
    });
    if (!student) throw new NotFoundException("Student not found");

    // Validate the package exists and has credits
    const pkgWithUses =
      await PackageQueryBuilder.buildStudentPackageWithUsesQuery(
        this.pkgRepo,
        student.id,
        packageId,
      ).getOne();

    if (!pkgWithUses) throw new NotFoundException("Package not found");

    // Compute remaining credits (total across all service types)
    const remainingCredits = computeRemainingCredits(
      pkgWithUses.totalSessions,
      pkgWithUses.uses || [],
    );

    if (remainingCredits <= 0)
      throw new BadRequestException("No remaining credits");
    if (pkgWithUses.expiresAt && pkgWithUses.expiresAt <= new Date()) {
      throw new BadRequestException("Package has expired");
    }

    // Validate availability
    await this.sessionsService.validatePrivateSession({
      teacherId: bookingData.teacherId,
      startAt: bookingData.startAt,
      endAt: bookingData.endAt,
      studentId: student.id,
    });

    // Create session and booking in a transaction
    return await this.sessionRepo.manager.transaction(async (tx) => {
      // Create the session
      const session = tx.create(Session, {
        type: ServiceType.PRIVATE,
        teacherId: bookingData.teacherId,
        startAt: new Date(bookingData.startAt),
        endAt: new Date(bookingData.endAt),
        capacityMax: 1,
        status: SessionStatus.SCHEDULED,
        visibility: SessionVisibility.PRIVATE,
        requiresEnrollment: false,
        sourceTimezone: "UTC",
      });
      const savedSession = await tx.save(Session, session);

      // Lock the package for validation
      const lockedPkg = await tx.findOne(StudentPackage, {
        where: { id: packageId },
        lock: { mode: "pessimistic_write" },
      });
      if (!lockedPkg) throw new NotFoundException("Package not found");

      // Load uses and recompute remaining credits within transaction
      const uses = await tx.find(PackageUse, {
        where: { studentPackageId: packageId },
      });
      const remainingInTx = computeRemainingCredits(
        lockedPkg.totalSessions,
        uses,
      );
      if (remainingInTx <= 0)
        throw new BadRequestException("No remaining credits");

      // Create package use record instead of decrementing a column
      const packageUse = tx.create(PackageUse, {
        studentPackageId: packageId,
        sessionId: savedSession.id,
        serviceType: ServiceType.PRIVATE,
        creditsUsed: 1,
        usedAt: new Date(),
        usedBy: student.id,
      });
      const savedPackageUse = await tx.save(PackageUse, packageUse);

      // Create confirmed booking
      const booking = tx.create(Booking, {
        sessionId: savedSession.id,
        studentId: student.id,
        status: BookingStatus.CONFIRMED,
        acceptedAt: new Date(),
        studentPackageId: packageId,
        creditsCost: 1,
      });
      const savedBooking = await tx.save(Booking, booking);

      // Link package use to booking
      savedPackageUse.bookingId = savedBooking.id;
      await tx.save(PackageUse, savedPackageUse);

      return {
        session: savedSession,
        booking: savedBooking,
        package: {
          ...lockedPkg,
          // Compute final remaining for response
          remainingSessions: remainingInTx - 1,
        },
        packageUse: savedPackageUse,
      };
    });
  }

  /**
   * Get packages compatible with a specific session, separated by tier match.
   * Returns exact matches (same tier) and higher-tier packages that can be used.
   *
   * @param studentId - Student's ID
   * @param sessionId - Session to check compatibility for
   * @returns Compatible packages grouped by tier match with recommendation
   */
  async getCompatiblePackagesForSession(
    studentId: number,
    sessionId: number,
  ): Promise<CompatiblePackagesForSessionResponseDto> {
    // Load session with teacher relation
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ["teacher", "groupClass"],
    });

    if (!session) {
      throw new NotFoundException("Session not found");
    }

    // Check if this is a course session
    // Note: courseStepOptions relation will be added when course system is implemented
    const requiresCourseEnrollment = session.type === ServiceType.COURSE;

    // TODO: Check actual enrollment when course system is fully implemented
    const isEnrolledInCourse = false;

    // Get student's active packages with uses loaded for balance computation
    const activePackages = await this.pkgRepo
      .createQueryBuilder("sp")
      .leftJoinAndSelect("sp.uses", "uses", "uses.deleted_at IS NULL")
      // allowances are owned by StripeProductMap; join via the stripeProductMap relation
      .leftJoinAndSelect("sp.stripeProductMap", "spm")
      .leftJoinAndSelect(
        "spm.allowances",
        "allowances",
        "allowances.deleted_at IS NULL",
      )
      .where("sp.student_id = :studentId", { studentId })
      .andWhere("sp.deleted_at IS NULL")
      .andWhere("(sp.expires_at IS NULL OR sp.expires_at > NOW())")
      .getMany();

    const sessionTier = getSessionTier(session);

    // Use shared DTO types from packages/shared
    const exactMatch: CompatiblePackage[] = [];
    const higherTier: CompatiblePackageWithWarning[] = [];

    for (const pkg of activePackages) {
      if (!canUsePackageForSession(pkg, session)) {
        continue; // Skip incompatible packages
      }

      const packageTier = getPackageTier(pkg);
      const label = getPackageDisplayLabel(pkg);
      const creditUnitMinutes = Number(pkg.metadata?.credit_unit_minutes) || 30;

      const allowances = pkg.stripeProductMap.allowances;

      // Compute remaining sessions from uses
      const remainingSessions = computeRemainingCredits(
        pkg.totalSessions,
        pkg.uses || [],
      );

      const baseInfo: CompatiblePackage = {
        id: pkg.id,
        label,
        remainingSessions,
        expiresAt: pkg.expiresAt?.toISOString() || null,
        creditUnitMinutes,
        tier: packageTier,
        allowances: allowances,
      };

      if (packageTier === sessionTier) {
        exactMatch.push(baseInfo);
      } else if (packageTier > sessionTier) {
        const warningMessage = getCrossTierWarningMessage(pkg, session) || "";
        const packageWithWarning: CompatiblePackageWithWarning = {
          ...baseInfo,
          warningMessage,
        };
        higherTier.push(packageWithWarning);
      }
    }

    // Select recommended package: prefer exact matches, then closest to expiration
    const recommended = this.selectRecommendedPackage(exactMatch, higherTier);

    return {
      exactMatch,
      higherTier,
      recommended,
      requiresCourseEnrollment,
      isEnrolledInCourse,
    };
  }

  /**
   * Select the recommended package from available options.
   * Prefers exact matches, then sorts by expiration (soonest first), then FIFO.
   *
   * @param exactMatch - Packages with exact tier match
   * @param higherTier - Packages with higher tier
   * @returns Recommended package ID or null
   */
  private selectRecommendedPackage(
    exactMatch: Array<{
      id: number;
      expiresAt: string | null;
    }>,
    higherTier: Array<{
      id: number;
      expiresAt: string | null;
    }>,
  ): number | null {
    // Prefer exact matches
    const candidates = exactMatch.length > 0 ? exactMatch : higherTier;

    if (candidates.length === 0) return null;

    // Sort by expiration (soonest first, non-expiring last)
    const sorted = [...candidates].sort((a, b) => {
      // Non-expiring packages go last
      if (!a.expiresAt && !b.expiresAt) return 0;
      if (!a.expiresAt) return 1;
      if (!b.expiresAt) return -1;

      // Compare expiration dates
      return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
    });

    return sorted[0].id;
  }
}
