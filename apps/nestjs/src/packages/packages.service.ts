import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import type { CreatePackageDto } from "@thrive/shared";
import { ConfigService } from "@nestjs/config";
import { InjectRepository, InjectDataSource } from "@nestjs/typeorm";
import { Repository, DataSource, EntityManager } from "typeorm";
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
  computeRemainingCreditsForAllowance,
} from "./utils/bundle-helpers.js";
import { PackageQueryBuilder } from "./utils/package-query-builder.js";
// import {
//   getSessionTier,
//   SERVICE_TYPE_BASE_TIERS,
// } from "../common/types/credit-tiers.js";

import {
  getSessionTier,
  canUseAllowanceForSession,
  getAllowanceTier,
  getAllowanceDisplayLabel,
  getAllowanceCrossTierWarningMessage,
  SERVICE_TYPE_BASE_TIERS,
} from "../common/types/credit-tiers.js";
import { StripeProductService } from "../common/services/stripe-product.service.js";

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
    @InjectDataSource() private readonly dataSource: DataSource,

    private readonly sessionsService: SessionsService,
    private readonly stripeProductService: StripeProductService,
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
      .innerJoin(
        "spm.allowances",
        "allowances_filter",
        "allowances_filter.service_type = :serviceType AND allowances_filter.deleted_at IS NULL",
        { serviceType },
      )
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

      // Create Stripe product and price using centralized service
      const { product: stripeProduct, price: stripePrice } =
        await this.stripeProductService.createProductWithPrice(
          {
            name: dto.name,
            description: dto.description,
            metadata: {
              name: dto.name,
              allowances: JSON.stringify(dto.allowances),
              expires_in_days: dto.expiresInDays?.toString() || "",
              scope: dto.scope,
            },
          },
          {
            amountMinor: dto.amountMinor,
            currency: dto.currency,
            lookupKey,
            metadata: {
              allowances: JSON.stringify(dto.allowances),
            },
          },
        );

      // Create local mapping
      const mapping = this.stripeProductMapRepository.create({
        serviceKey: lookupKey,
        stripeProductId: stripeProduct.id,
        active: true,
        scopeType: ScopeType.PACKAGE,
        scopeId: undefined, // Will be set after save
        metadata: {
          name: dto.name,
          bundle_description:
            dto.bundleDescription || generateBundleDescription(dto.allowances),
        },
      });

      const savedMapping = await this.stripeProductMapRepository.save(mapping);

      // Set scopeId to the package ID itself for packages
      savedMapping.scopeId = savedMapping.id;
      await this.stripeProductMapRepository.save(savedMapping);

      // Create PackageAllowance rows
      const allowances = dto.allowances.map((a) => {
        const courseProgramId: number | undefined =
          a.courseProgramId ?? undefined;
        return this.allowanceRepo.create({
          stripeProductMapId: savedMapping.id,
          courseProgramId,
          createdAt: new Date(),
          credits: a.credits,
          creditUnitMinutes: a.creditUnitMinutes,
          serviceType: a.serviceType,
          stripeProductMap: savedMapping,
          teacherTier: a.teacherTier || 0,
        });
      });
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
    console.log("Fetching active packages for student", studentId);
    // Load packages with uses
    const packages = await PackageQueryBuilder.buildActiveStudentPackagesQuery(
      this.pkgRepo,
      studentId,
    )
      .orderBy("sp.created_at", "DESC")
      .getMany();

    // For each package, load the stripeProductMap with allowances separately
    // to avoid query complexity issues
    const packagesWithMappings = await Promise.all(
      packages.map(async (pkg) => {
        const mapping = await this.stripeProductMapRepository.findOne({
          where: { id: pkg.stripeProductMapId },
          relations: ["allowances"],
        });
        return { ...pkg, stripeProductMap: mapping };
      }),
    );

    // Compute remaining for each package
    const withRemaining = packagesWithMappings.map((pkg) => {
      const remainingSessions = computeRemainingCredits(
        pkg.totalSessions,
        pkg.uses || [],
      );

      // Map allowances from stripeProductMap, calculating remaining credits per allowance
      const allowances = (pkg.stripeProductMap?.allowances || []).map(
        (allowance: PackageAllowance) => {
          // Calculate remaining credits for this specific allowance
          // by summing up credits_used from PackageUse records for this allowance
          const usedCreditsForAllowance = (pkg.uses || [])
            .filter((use) => use.allowanceId === allowance.id)
            .reduce((sum, use) => sum + (use.creditsUsed || 1), 0);

          return {
            id: allowance.id,
            serviceType: allowance.serviceType,
            teacherTier: allowance.teacherTier ?? 0,
            credits: allowance.credits,
            remainingCredits: Math.max(
              0,
              allowance.credits - usedCreditsForAllowance,
            ),
            creditUnitMinutes: allowance.creditUnitMinutes,
          };
        },
      );

      return {
        id: pkg.id,
        packageName: pkg.packageName,
        totalSessions: pkg.totalSessions,
        remainingSessions,
        purchasedAt: pkg.purchasedAt.toISOString(),
        expiresAt: pkg.expiresAt ? pkg.expiresAt.toISOString() : null,
        allowances,
      };
    });

    console.log("withremaining", withRemaining);

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
      allowanceId?: number;
    },
    transactionManager?: EntityManager,
  ): Promise<{ package: StudentPackage; use: PackageUse }> {
    const { serviceType, creditsUsed = 1, usedBy, allowanceId } = options || {};

    // Load with uses for balance computation (pessimistic lock)
    const queryBuilder = transactionManager
      ? transactionManager
          .createQueryBuilder(StudentPackage, "sp")
          .leftJoinAndSelect("sp.uses", "uses", "uses.deleted_at IS NULL")
          .leftJoinAndSelect("sp.stripeProductMap", "spm")
          .leftJoinAndSelect("spm.allowances", "allowances")
          .where("sp.id = :packageId", { packageId })
          .andWhere("sp.student_id = :studentId", { studentId })
          .andWhere("sp.deleted_at IS NULL")
      : PackageQueryBuilder.buildStudentPackageWithUsesQuery(
          this.pkgRepo,
          studentId,
          packageId,
        )
          .leftJoinAndSelect("sp.stripeProductMap", "spm")
          .leftJoinAndSelect("spm.allowances", "allowances");

    const pkg = await queryBuilder.setLock("pessimistic_write").getOne();

    if (!pkg) {
      throw new NotFoundException("Package not found");
    }

    // Validate allowance if provided
    let validatedAllowance: PackageAllowance | undefined;
    if (allowanceId) {
      const allowances = pkg.stripeProductMap?.allowances || [];
      validatedAllowance = allowances.find((a) => a.id === allowanceId);

      if (!validatedAllowance) {
        throw new BadRequestException(
          `Allowance ${allowanceId} not found in package ${packageId}`,
        );
      }

      // Check remaining credits for this specific allowance
      const allowanceRemaining = computeRemainingCreditsForAllowance(
        validatedAllowance,
        pkg.uses || [],
      );

      if (allowanceRemaining < creditsUsed) {
        throw new BadRequestException(
          `Insufficient credits for this allowance. Required: ${creditsUsed}, Available: ${allowanceRemaining}`,
        );
      }
    } else {
      // Fallback: check total package credits if no allowanceId specified
      const remaining = computeRemainingCredits(
        pkg.totalSessions,
        pkg.uses || [],
      );

      if (remaining < creditsUsed) {
        throw new BadRequestException(
          `Insufficient credits. Required: ${creditsUsed}, Available: ${remaining}`,
        );
      }
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
      allowanceId: allowanceId || null,
    });

    const savedUse = await (transactionManager
      ? transactionManager.save(use)
      : this.useRepo.save(use));

    // Return the locked package (no need to reload within the same transaction)
    return { package: pkg, use: savedUse };
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
    allowanceId: number,
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
      )
        .leftJoinAndSelect("sp.stripeProductMap", "spm")
        .leftJoinAndSelect("spm.allowances", "allowances")
        .getOne();

    if (!pkgWithUses) throw new NotFoundException("Package not found");

    // Validate allowance
    const allowances = pkgWithUses.stripeProductMap?.allowances || [];
    const allowance = allowances.find((a) => a.id === allowanceId);

    if (!allowance) {
      throw new BadRequestException(
        `Allowance ${allowanceId} not found in package ${packageId}`,
      );
    }

    // Compute remaining credits for this specific allowance
    const remainingCredits = computeRemainingCreditsForAllowance(
      allowance,
      pkgWithUses.uses || [],
    );

    if (remainingCredits <= 0)
      throw new BadRequestException("No remaining credits for this allowance");
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
        allowanceId: allowanceId,
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
   * Returns allowance-level options (each allowance within each package is a separate option).
   *
   * @param studentId - Student's ID
   * @param sessionId - Session to check compatibility for
   * @returns Compatible allowances grouped by tier match with recommendation
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

    // Note: Course sessions have been moved to the course-programs system
    // Legacy COURSE service type is no longer used for new bookings
    const requiresCourseEnrollment = false;
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

    console.log(
      `Found ${activePackages.length} active packages for student ${studentId}`,
    );

    const sessionTier = getSessionTier(session);
    console.log(`Session ${session.id} has tier ${sessionTier}`);

    // Use shared DTO types from packages/shared
    const exactMatch: CompatiblePackage[] = [];
    const higherTier: CompatiblePackageWithWarning[] = [];

    // Iterate through each package and each allowance within it
    for (const pkg of activePackages) {
      const allowances = pkg.stripeProductMap?.allowances || [];
      const packageName =
        (pkg.metadata?.name as string) ||
        String(pkg.stripeProductMap?.metadata?.name || "Package");

      for (const allowance of allowances) {
        // Check if this specific allowance is compatible with the session
        if (!canUseAllowanceForSession(allowance, session)) {
          console.log(
            `Allowance ${allowance.id} (${allowance.serviceType}) in package ${pkg.id} cannot be used for session ${session.id}`,
          );
          continue;
        }

        // Compute remaining credits for this specific allowance
        const remainingSessions = computeRemainingCreditsForAllowance(
          allowance,
          pkg.uses || [],
        );

        // Skip if no credits remaining for this allowance
        if (remainingSessions <= 0) {
          console.log(
            `Allowance ${allowance.id} in package ${pkg.id} has no remaining credits`,
          );
          continue;
        }

        const allowanceTier = getAllowanceTier(allowance);
        const label = getAllowanceDisplayLabel(allowance);

        const baseInfo: CompatiblePackage = {
          id: pkg.id, // Student package ID
          allowanceId: allowance.id,
          packageName: String(packageName || "Package"),
          label,
          remainingSessions,
          expiresAt: pkg.expiresAt?.toISOString() || null,
          creditUnitMinutes: allowance.creditUnitMinutes,
          tier: allowanceTier,
          serviceType: allowance.serviceType,
          teacherTier: allowance.teacherTier,
        };

        console.log(
          `Allowance ${allowance.id} in package ${pkg.id} has tier ${allowanceTier}`,
        );

        if (allowanceTier === sessionTier) {
          exactMatch.push(baseInfo);
        } else if (allowanceTier > sessionTier) {
          const warningMessage =
            getAllowanceCrossTierWarningMessage(allowance, session) || "";
          const allowanceWithWarning: CompatiblePackageWithWarning = {
            ...baseInfo,
            warningMessage,
          };
          higherTier.push(allowanceWithWarning);
        }
      }
    }

    // Select recommended allowance: prefer exact matches, then closest to expiration
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
   * Select the recommended allowance option from available options.
   * Prefers exact matches, then sorts by expiration (soonest first), then FIFO.
   * Returns the student package ID (not allowance ID) since that's what the UI expects.
   *
   * @param exactMatch - Allowances with exact tier match
   * @param higherTier - Allowances with higher tier
   * @returns Recommended student package ID or null
   */
  private selectRecommendedPackage(
    exactMatch: Array<{
      id: number;
      allowanceId: number;
      expiresAt: string | null;
    }>,
    higherTier: Array<{
      id: number;
      allowanceId: number;
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

    // Return the package ID of the first (recommended) option
    return sorted[0].id;
  }

  /**
   * Get compatible packages for a booking based on service type and teacher tier.
   * This is similar to getCompatiblePackagesForSession but works with booking params
   * instead of an existing session (used for private session availability booking).
   *
   * @param studentId - Student ID
   * @param serviceType - Service type (PRIVATE, GROUP, etc.)
   * @param teacherTier - Teacher tier (from Teacher entity)
   * @returns Compatible packages response
   */
  async getCompatiblePackagesForBooking(
    studentId: number,
    serviceType: ServiceType,
    teacherTier: number,
  ): Promise<CompatiblePackagesForSessionResponseDto> {
    // Get student's active packages with uses loaded for balance computation
    const activePackages = await this.pkgRepo
      .createQueryBuilder("sp")
      .leftJoinAndSelect("sp.uses", "uses", "uses.deleted_at IS NULL")
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

    console.log(
      `Found ${activePackages.length} active packages for student ${studentId}`,
    );

    // Calculate the target tier (base service tier + teacher tier)
    const baseServiceTier = SERVICE_TYPE_BASE_TIERS[serviceType] ?? 0;
    const targetTier = baseServiceTier + teacherTier;
    console.log(
      `Target tier for ${serviceType} booking with teacher tier ${teacherTier}: ${targetTier}`,
    );

    const exactMatch: CompatiblePackage[] = [];
    const higherTier: CompatiblePackageWithWarning[] = [];

    // Iterate through each package and each allowance within it
    for (const pkg of activePackages) {
      const allowances = pkg.stripeProductMap?.allowances || [];
      const packageName =
        (pkg.metadata?.name as string) ||
        String(pkg.stripeProductMap?.metadata?.name || "Package");

      for (const allowance of allowances) {
        // Check if this allowance matches the service type
        if (allowance.serviceType !== serviceType) {
          console.log(
            `Allowance ${allowance.id} service type ${allowance.serviceType} doesn't match ${serviceType}`,
          );
          continue;
        }

        // Calculate allowance tier
        const allowanceTier = getAllowanceTier(allowance);

        // Allowance must have equal or higher tier than target
        if (allowanceTier < targetTier) {
          console.log(
            `Allowance ${allowance.id} tier ${allowanceTier} is lower than target ${targetTier}`,
          );
          continue;
        }

        // Compute remaining credits for this specific allowance
        const remainingSessions = computeRemainingCreditsForAllowance(
          allowance,
          pkg.uses || [],
        );

        // Skip if no credits remaining for this allowance
        if (remainingSessions <= 0) {
          console.log(
            `Allowance ${allowance.id} in package ${pkg.id} has no remaining credits`,
          );
          continue;
        }

        const label = getAllowanceDisplayLabel(allowance);

        const baseInfo: CompatiblePackage = {
          id: pkg.id, // Student package ID
          allowanceId: allowance.id,
          packageName: String(packageName || "Package"),
          label,
          remainingSessions,
          expiresAt: pkg.expiresAt?.toISOString() || null,
          creditUnitMinutes: allowance.creditUnitMinutes,
          tier: allowanceTier,
          serviceType: allowance.serviceType,
          teacherTier: allowance.teacherTier,
        };

        console.log(
          `Allowance ${allowance.id} in package ${pkg.id} has tier ${allowanceTier}`,
        );

        if (allowanceTier === targetTier) {
          exactMatch.push(baseInfo);
        } else if (allowanceTier > targetTier) {
          // Generate warning message for cross-tier usage
          const tierDifference = allowanceTier - targetTier;
          const warningMessage = `This will use a ${label} (tier ${allowanceTier}) for a ${serviceType.toLowerCase()} session with a tier ${teacherTier} teacher (tier ${targetTier}). The credit is ${tierDifference} tier${tierDifference > 1 ? "s" : ""} higher than needed.`;

          const allowanceWithWarning: CompatiblePackageWithWarning = {
            ...baseInfo,
            warningMessage,
          };
          higherTier.push(allowanceWithWarning);
        }
      }
    }

    // Select recommended allowance: prefer exact matches, then closest to expiration
    const recommended = this.selectRecommendedPackage(exactMatch, higherTier);

    return {
      exactMatch,
      higherTier,
      recommended,
      requiresCourseEnrollment: false, // Not applicable for booking flow
      isEnrolledInCourse: false,
    };
  }
}
