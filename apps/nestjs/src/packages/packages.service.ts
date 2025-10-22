import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import type { CreatePackageDto } from "@thrive/shared";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, DataSource } from "typeorm";
import Stripe from "stripe";
import {
  PackageResponseDto,
  CompatiblePackagesForSessionResponseDto,
} from "@thrive/shared";
import {
  StripeProductMap,
  ScopeType,
} from "../payments/entities/stripe-product-map.entity.js";
import { StudentPackage } from "./entities/student-package.entity.js";
import { PackageUse } from "./entities/package-use.entity.js";
import { Student } from "../students/entities/student.entity.js";
import {
  Session,
  SessionStatus,
  SessionVisibility,
} from "../sessions/entities/session.entity.js";
import { Booking, BookingStatus } from "../payments/entities/booking.entity.js";
import { ServiceType } from "../common/types/class-types.js";
import { SessionsService } from "../sessions/services/sessions.service.js";
// import {
//   getSessionTier,
//   SERVICE_TYPE_BASE_TIERS,
// } from "../common/types/credit-tiers.js";

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

  async getPackages(): Promise<PackageResponseDto[]> {
    const mappings = await this.stripeProductMapRepository.find({
      where: {
        scopeType: ScopeType.PACKAGE,
      },
      order: { createdAt: "DESC" },
    });

    const packages: PackageResponseDto[] = [];

    for (const mapping of mappings) {
      try {
        // Get fresh data from Stripe
        const stripeProduct = await this.stripe.products.retrieve(
          mapping.stripeProductId,
        );

        // Get the first price for this product
        const prices = await this.stripe.prices.list({
          product: mapping.stripeProductId,
          active: true,
          limit: 1,
        });

        if (prices.data.length === 0) {
          continue; // Skip if no active prices
        }

        const stripePrice = prices.data[0];
        const metadata = mapping.metadata || {};

        packages.push({
          id: mapping.id,
          name: String(metadata.name) || stripeProduct.name,
          serviceType: mapping.serviceType || "PRIVATE",
          credits: Number(metadata.credits) || 0,
          creditUnitMinutes: Number(metadata.credit_unit_minutes) || 30,
          teacherTier:
            mapping.teacherTier && mapping.teacherTier > 0
              ? mapping.teacherTier
              : null,
          expiresInDays: Number(metadata.expires_in_days) || null,
          stripe: {
            productId: stripeProduct.id,
            priceId: stripePrice.id,
            lookupKey: stripePrice.lookup_key || mapping.serviceKey,
            unitAmount: stripePrice.unit_amount || 0,
            currency: stripePrice.currency || "usd",
          },
          active: mapping.active && stripeProduct.active,
        });
      } catch (error) {
        console.warn(
          `Failed to fetch Stripe data for mapping ${mapping.id}:`,
          error instanceof Error ? error.message : "Unknown error",
        );
        // Continue with other packages
      }
    }

    return packages;
  }

  async getActivePackages(): Promise<PackageResponseDto[]> {
    const mappings = await this.stripeProductMapRepository.find({
      where: {
        scopeType: ScopeType.PACKAGE,
        active: true,
      },
      order: { createdAt: "DESC" },
    });

    const packages: PackageResponseDto[] = [];

    for (const mapping of mappings) {
      try {
        // Get fresh data from Stripe
        const stripeProduct = await this.stripe.products.retrieve(
          mapping.stripeProductId,
        );

        // Skip if product is not active in Stripe
        if (!stripeProduct.active) {
          continue;
        }

        // Get the first price for this product
        const prices = await this.stripe.prices.list({
          product: mapping.stripeProductId,
          active: true,
          limit: 1,
        });

        if (prices.data.length === 0) {
          continue; // Skip if no active prices
        }

        const stripePrice = prices.data[0];
        const metadata = mapping.metadata || {};

        packages.push({
          id: mapping.id,
          name: String(metadata.name) || stripeProduct.name,
          serviceType: mapping.serviceType || "PRIVATE",
          credits: Number(metadata.credits) || 0,
          creditUnitMinutes: Number(metadata.credit_unit_minutes) || 30,
          teacherTier:
            mapping.teacherTier && mapping.teacherTier > 0
              ? mapping.teacherTier
              : null,
          expiresInDays: Number(metadata.expires_in_days) || null,
          stripe: {
            productId: stripeProduct.id,
            priceId: stripePrice.id,
            lookupKey: stripePrice.lookup_key || mapping.serviceKey,
            unitAmount: stripePrice.unit_amount || 0,
            currency: stripePrice.currency || "usd",
          },
          active: mapping.active && stripeProduct.active,
        });
      } catch (error) {
        console.warn(
          `Failed to fetch Stripe data for mapping ${mapping.id}:`,
          error instanceof Error ? error.message : "Unknown error",
        );
        // Continue with other packages
      }
    }

    return packages;
  }

  async getValidPackagesForSession(
    sessionId: number,
  ): Promise<PackageResponseDto[]> {
    // Load session with teacher relation to get tier information
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ["teacher"],
    });

    if (!session) {
      throw new NotFoundException("Session not found");
    }

    // const sessionTier = getSessionTier(session);
    const sessionServiceType = session.type;

    // Query compatible mappings directly in SQL with tier filtering
    const compatibleMappings = await this.stripeProductMapRepository
      .createQueryBuilder("spm")
      .where("spm.scope_type = :scopeType", { scopeType: ScopeType.PACKAGE })
      .andWhere("spm.active = :active", { active: true })
      .andWhere("spm.deleted_at IS NULL")
      .andWhere("spm.service_type = :serviceType", {
        serviceType: sessionServiceType,
      })
      // .andWhere("(spm.teacher_tier + :baseTier) >= :sessionTier", {
      //   baseTier: SERVICE_TYPE_BASE_TIERS[sessionServiceType] ?? 0,
      //   sessionTier,
      // })
      .getMany();

    // Build PackageResponseDto objects like other methods
    const packages: PackageResponseDto[] = [];

    for (const mapping of compatibleMappings) {
      try {
        // Get fresh data from Stripe
        const stripeProduct = await this.stripe.products.retrieve(
          mapping.stripeProductId,
        );

        // Skip if product is not active in Stripe
        if (!stripeProduct.active) {
          continue;
        }

        // Get the first price for this product
        const prices = await this.stripe.prices.list({
          product: mapping.stripeProductId,
          active: true,
          limit: 1,
        });

        if (prices.data.length === 0) {
          continue; // Skip if no active prices
        }

        const stripePrice = prices.data[0];
        const metadata = mapping.metadata || {};

        packages.push({
          id: mapping.id,
          name: String(metadata.name) || stripeProduct.name,
          serviceType: mapping.serviceType || "PRIVATE",
          credits: Number(metadata.credits) || 0,
          creditUnitMinutes: Number(metadata.credit_unit_minutes) || 30,
          teacherTier:
            mapping.teacherTier && mapping.teacherTier > 0
              ? mapping.teacherTier
              : null,
          expiresInDays: Number(metadata.expires_in_days) || null,
          stripe: {
            productId: stripeProduct.id,
            priceId: stripePrice.id,
            lookupKey: stripePrice.lookup_key || mapping.serviceKey,
            unitAmount: stripePrice.unit_amount || 0,
            currency: stripePrice.currency || "usd",
          },
          active: mapping.active && stripeProduct.active,
        });
      } catch (error) {
        console.warn(
          `Failed to fetch Stripe data for mapping ${mapping.id}:`,
          error instanceof Error ? error.message : "Unknown error",
        );
        // Continue with other packages
      }
    }

    return packages;
  }

  async getPackage(id: number): Promise<PackageResponseDto> {
    const mapping = await this.stripeProductMapRepository.findOne({
      where: {
        id,
        scopeType: ScopeType.PACKAGE,
      },
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

      const stripePrice = prices.data[0];
      const metadata = mapping.metadata || {};

      const packageResponse: PackageResponseDto = {
        id: mapping.id,
        name: String(metadata.name) || stripeProduct.name,
        serviceType: mapping.serviceType || "PRIVATE",
        credits: Number(metadata.credits) || 0,
        creditUnitMinutes: Number(metadata.credit_unit_minutes) || 30,
        teacherTier:
          mapping.teacherTier && mapping.teacherTier > 0
            ? mapping.teacherTier
            : null,
        expiresInDays: Number(metadata.expires_in_days) || null,
        stripe: {
          productId: stripeProduct.id,
          priceId: stripePrice.id,
          lookupKey: stripePrice.lookup_key || mapping.serviceKey,
          unitAmount: stripePrice.unit_amount || 0,
          currency: stripePrice.currency || "usd",
        },
        active: mapping.active && stripeProduct.active,
      };

      return packageResponse;
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
  generateLookupKey(dto: CreatePackageDto) {
    const sanitizedName = dto.name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 30);
    return `${dto.serviceType}_CREDITS_${dto.credits}_${dto.creditUnitMinutes}MIN_${sanitizedName}_${dto.currency.toUpperCase()}`;
  }

  /**
   * Create a new package: create Stripe product & price, then local mapping.
   */
  async createPackage(createPackageDto: CreatePackageDto) {
    try {
      // Generate lookup key if not provided
      const lookupKey =
        createPackageDto.lookupKey || this.generateLookupKey(createPackageDto);

      // Check if lookup key already exists
      const existingMapping = await this.stripeProductMapRepository.findOne({
        where: { serviceKey: lookupKey },
      });
      if (existingMapping) {
        throw new BadRequestException(
          `Lookup key "${lookupKey}" already exists`,
        );
      }

      // Create Stripe Product
      const stripeProduct = await this.stripe.products.create({
        name: createPackageDto.name,
        description:
          (createPackageDto.description || createPackageDto.name) ?? "N/A",
        type: "service",
        metadata: {
          offering_type: "PACKAGE",
          service_type: createPackageDto.serviceType,
          credits: createPackageDto.credits.toString(),
          credit_unit_minutes: createPackageDto.creditUnitMinutes.toString(),
          expires_in_days: createPackageDto.expiresInDays?.toString() || "",
          scope: createPackageDto.scope,
          teacher_tier: createPackageDto.teacherTier?.toString() || "",
        },
      });

      // Create Stripe Price
      const stripePrice = await this.stripe.prices.create({
        unit_amount: createPackageDto.amountMinor,
        currency: createPackageDto.currency.toLowerCase(),
        product: stripeProduct.id,
        lookup_key: lookupKey,
        metadata: {
          offering_type: "PACKAGE",
          service_type: createPackageDto.serviceType,
          credits: createPackageDto.credits.toString(),
          credit_unit_minutes: createPackageDto.creditUnitMinutes.toString(),
          expires_in_days: createPackageDto.expiresInDays?.toString() || "",
          scope: createPackageDto.scope,
          teacher_tier: createPackageDto.teacherTier?.toString() || "",
        },
      });

      // Create local mapping
      const productMapping = this.stripeProductMapRepository.create({
        serviceKey: lookupKey,
        stripeProductId: stripeProduct.id,
        active: true,
        scopeType: ScopeType.PACKAGE,
        serviceType: createPackageDto.serviceType,
        teacherTier: createPackageDto.teacherTier ?? 0,
        metadata: {
          name: createPackageDto.name,
          service_type: createPackageDto.serviceType,
          credits: createPackageDto.credits,
          credit_unit_minutes: createPackageDto.creditUnitMinutes,
          expires_in_days: createPackageDto.expiresInDays ?? undefined,
          scope: createPackageDto.scope,
          stripe_price_id: stripePrice.id,
          lookup_key: lookupKey ?? "",
          teacher_tier: createPackageDto.teacherTier ?? undefined,
        },
      });

      const savedMapping =
        await this.stripeProductMapRepository.save(productMapping);

      return {
        id: savedMapping.id,
        name: createPackageDto.name,
        serviceType: createPackageDto.serviceType,
        credits: createPackageDto.credits,
        creditUnitMinutes: createPackageDto.creditUnitMinutes,
        expiresInDays: createPackageDto.expiresInDays || null,
        teacherTier: createPackageDto.teacherTier ?? null,
        stripe: {
          productId: stripeProduct.id,
          priceId: stripePrice.id,
          lookupKey: lookupKey,
          unitAmount: stripePrice.unit_amount || 0,
          currency: stripePrice.currency || "usd",
        },
        active: true,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Handle Stripe errors
      // Use Stripe's runtime error type when available
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
    const pkgs = await this.pkgRepo.find({
      where: { studentId, deletedAt: IsNull() },
      order: { createdAt: "DESC" },
    });

    // Filter active packages (not expired and has remaining sessions)
    const now = new Date();
    const activePackages = pkgs.filter(
      (pkg) =>
        pkg.remainingSessions > 0 &&
        (pkg.expiresAt === null || pkg.expiresAt > now),
    );

    return {
      packages: activePackages.map((pkg) => ({
        id: pkg.id,
        packageName: pkg.packageName,
        totalSessions: pkg.totalSessions,
        remainingSessions: pkg.remainingSessions,
        purchasedAt: pkg.purchasedAt.toISOString(),
        expiresAt: pkg.expiresAt?.toISOString() || null,
        creditUnitMinutes: Number(pkg.metadata?.credit_unit_minutes) || null,
        teacherTier: ((): number | null => {
          const raw = pkg.metadata?.teacher_tier;
          const n =
            typeof raw === "string"
              ? parseInt(raw, 10)
              : (raw as number | undefined);
          return Number.isFinite(n) ? (n as number) : null;
        })(),
        serviceType: (pkg.metadata?.service_type as string) || "PRIVATE",
      })),
      totalRemaining: activePackages.reduce(
        (sum, pkg) => sum + pkg.remainingSessions,
        0,
      ),
      totalRemainingByTime: activePackages.reduce(
        (sum, pkg) =>
          sum +
          pkg.remainingSessions *
            (Number(pkg.metadata?.credit_unit_minutes) || 0),
        0,
      ),
    };
  }

  async usePackageForSession(
    studentId: number,
    packageId: number,
    sessionId: number,
    usedBy?: number,
    creditsCost: number = 1,
  ) {
    const pkg = await this.pkgRepo.findOne({
      where: { id: packageId, studentId },
    });
    if (!pkg) throw new NotFoundException("Package not found");
    if (pkg.remainingSessions < creditsCost)
      throw new BadRequestException(
        `Insufficient credits. Required: ${creditsCost}, Available: ${pkg.remainingSessions}`,
      );

    // Check if package is expired
    if (pkg.expiresAt && pkg.expiresAt <= new Date()) {
      throw new BadRequestException("Package has expired");
    }

    return await this.pkgRepo.manager.transaction(async (tx) => {
      // Lock and re-fetch inside transaction with pessimistic lock
      const locked = await tx.findOne(StudentPackage, {
        where: { id: packageId },
        lock: { mode: "pessimistic_write" },
      });
      if (!locked) throw new NotFoundException("Package not found");
      if (locked.remainingSessions < creditsCost)
        throw new BadRequestException(
          `Insufficient credits. Required: ${creditsCost}, Available: ${locked.remainingSessions}`,
        );

      locked.remainingSessions = locked.remainingSessions - creditsCost;
      await tx.save(StudentPackage, locked);

      const use = tx.create(PackageUse, {
        studentPackageId: packageId,
        sessionId,
        usedAt: new Date(),
        usedBy: usedBy || studentId,
      });
      await tx.save(PackageUse, use);

      return { package: locked, use };
    });
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
    const pkg = await this.pkgRepo.findOne({
      where: { id: packageId, studentId: student.id },
    });
    if (!pkg) throw new NotFoundException("Package not found");
    if (pkg.remainingSessions <= 0)
      throw new BadRequestException("No remaining credits");
    if (pkg.expiresAt && pkg.expiresAt <= new Date()) {
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

      // Lock and decrement the package
      const lockedPkg = await tx.findOne(StudentPackage, {
        where: { id: packageId },
        lock: { mode: "pessimistic_write" },
      });
      if (!lockedPkg) throw new NotFoundException("Package not found");
      if (lockedPkg.remainingSessions <= 0)
        throw new BadRequestException("No remaining credits");

      lockedPkg.remainingSessions = lockedPkg.remainingSessions - 1;
      await tx.save(StudentPackage, lockedPkg);

      // Create package use record
      const packageUse = tx.create(PackageUse, {
        studentPackageId: packageId,
        sessionId: savedSession.id,
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
        package: lockedPkg,
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
    const {
      canUsePackageForSession,
      getPackageTier,
      getSessionTier,
      getPackageDisplayLabel,
      getCrossTierWarningMessage,
    } = await import("../common/types/credit-tiers.js");

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

    // Get student's active packages
    const activePackages = await this.pkgRepo.find({
      where: {
        studentId,
        deletedAt: IsNull(),
      },
      order: { createdAt: "DESC" },
    });

    // Filter to packages with remaining sessions and not expired
    const now = new Date();
    const validPackages = activePackages.filter(
      (pkg) =>
        pkg.remainingSessions > 0 &&
        (pkg.expiresAt === null || pkg.expiresAt > now),
    );

    const sessionTier = getSessionTier(session);
    const exactMatch: Array<{
      id: number;
      label: string;
      remainingSessions: number;
      expiresAt: string | null;
      creditUnitMinutes: number;
      tier: number;
    }> = [];
    const higherTier: Array<{
      id: number;
      label: string;
      remainingSessions: number;
      expiresAt: string | null;
      creditUnitMinutes: number;
      tier: number;
      warningMessage: string;
    }> = [];

    for (const pkg of validPackages) {
      if (!canUsePackageForSession(pkg, session)) {
        continue; // Skip incompatible packages
      }

      const packageTier = getPackageTier(pkg);
      const label = getPackageDisplayLabel(pkg);
      const creditUnitMinutes = Number(pkg.metadata?.credit_unit_minutes) || 30;

      const baseInfo = {
        id: pkg.id,
        label,
        remainingSessions: pkg.remainingSessions,
        expiresAt: pkg.expiresAt?.toISOString() || null,
        creditUnitMinutes,
        tier: packageTier,
      };

      if (packageTier === sessionTier) {
        exactMatch.push(baseInfo);
      } else if (packageTier > sessionTier) {
        const warningMessage = getCrossTierWarningMessage(pkg, session) || "";
        higherTier.push({
          ...baseInfo,
          warningMessage,
        });
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
