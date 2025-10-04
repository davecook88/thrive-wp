import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, IsNull } from 'typeorm';
import Stripe from 'stripe';
import { CreatePackageDto } from './dto/create-package.dto.js';
import { PackageResponseDto } from './dto/package-response.dto.js';
import {
  StripeProductMap,
  ScopeType,
} from '../payments/entities/stripe-product-map.entity.js';
import { StudentPackage } from './entities/student-package.entity.js';
import { PackageUse } from './entities/package-use.entity.js';

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
  ) {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    if (!secretKey) {
      throw new Error('Stripe secret key is not configured');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil',
    });
  }

  async createPackage(
    createPackageDto: CreatePackageDto,
  ): Promise<PackageResponseDto> {
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

      console.log(
        'Creating package with lookup key:',
        lookupKey,
        createPackageDto,
      );

      // Create Stripe Product
      const stripeProduct = await this.stripe.products.create({
        name: createPackageDto.name,
        description:
          (createPackageDto.description || createPackageDto.name) ?? 'N/A',
        type: 'service',
        metadata: {
          offering_type: 'PACKAGE',
          service_type: createPackageDto.serviceType,
          credits: createPackageDto.credits.toString(),
          credit_unit_minutes: createPackageDto.creditUnitMinutes.toString(),
          expires_in_days: createPackageDto.expiresInDays?.toString() || '',
          scope: createPackageDto.scope,
          teacher_tier: createPackageDto.teacherTier?.toString() || '',
        },
      });

      console.log('Created Stripe product:', stripeProduct.id);

      // Create Stripe Price
      const stripePrice = await this.stripe.prices.create({
        unit_amount: createPackageDto.amountMinor,
        currency: createPackageDto.currency.toLowerCase(),
        product: stripeProduct.id,
        lookup_key: lookupKey,
        metadata: {
          offering_type: 'PACKAGE',
          service_type: createPackageDto.serviceType,
          credits: createPackageDto.credits.toString(),
          credit_unit_minutes: createPackageDto.creditUnitMinutes.toString(),
          expires_in_days: createPackageDto.expiresInDays?.toString() || '',
          scope: createPackageDto.scope,
          teacher_tier: createPackageDto.teacherTier?.toString() || '',
        },
      });

      // Create local mapping
      const productMapping = this.stripeProductMapRepository.create({
        serviceKey: lookupKey,
        stripeProductId: stripeProduct.id,
        active: true,
        scopeType: ScopeType.PACKAGE,
        metadata: {
          name: createPackageDto.name,
          service_type: createPackageDto.serviceType,
          credits: createPackageDto.credits,
          credit_unit_minutes: createPackageDto.creditUnitMinutes,
          expires_in_days: createPackageDto.expiresInDays,
          scope: createPackageDto.scope,
          stripe_price_id: stripePrice.id,
          lookup_key: lookupKey ?? '',
          teacher_tier: createPackageDto.teacherTier ?? null,
        },
      } as DeepPartial<StripeProductMap>);

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
          currency: stripePrice.currency || 'usd',
        },
        active: true,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Handle Stripe errors
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(`Stripe error: ${error.message}`);
      }

      throw new BadRequestException(
        `Failed to create package: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getPackages(): Promise<PackageResponseDto[]> {
    const mappings = await this.stripeProductMapRepository.find({
      where: {
        scopeType: ScopeType.PACKAGE,
      },
      order: { createdAt: 'DESC' },
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
          serviceType: String(metadata.service_type) || 'PRIVATE',
          credits: Number(metadata.credits) || 0,
          creditUnitMinutes: Number(metadata.credit_unit_minutes) || 30,
          teacherTier: ((): number | null => {
            const raw = metadata.teacher_tier;
            if (raw === undefined || raw === null || raw === '') return null;
            const n =
              typeof raw === 'string' ? parseInt(raw, 10) : (raw as number);
            return Number.isFinite(n) ? n : null;
          })(),
          expiresInDays: Number(metadata.expires_in_days) || null,
          stripe: {
            productId: stripeProduct.id,
            priceId: stripePrice.id,
            lookupKey: stripePrice.lookup_key || mapping.serviceKey,
            unitAmount: stripePrice.unit_amount || 0,
            currency: stripePrice.currency || 'usd',
          },
          active: mapping.active && stripeProduct.active,
        });
      } catch (error) {
        console.warn(
          `Failed to fetch Stripe data for mapping ${mapping.id}:`,
          error instanceof Error ? error.message : 'Unknown error',
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
      order: { createdAt: 'DESC' },
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
          serviceType: String(metadata.service_type) || 'PRIVATE',
          credits: Number(metadata.credits) || 0,
          creditUnitMinutes: Number(metadata.credit_unit_minutes) || 30,
          teacherTier: ((): number | null => {
            const raw = metadata.teacher_tier;
            if (raw === undefined || raw === null || raw === '') return null;
            const n =
              typeof raw === 'string' ? parseInt(raw, 10) : (raw as number);
            return Number.isFinite(n) ? n : null;
          })(),
          expiresInDays: Number(metadata.expires_in_days) || null,
          stripe: {
            productId: stripeProduct.id,
            priceId: stripePrice.id,
            lookupKey: stripePrice.lookup_key || mapping.serviceKey,
            unitAmount: stripePrice.unit_amount || 0,
            currency: stripePrice.currency || 'usd',
          },
          active: mapping.active && stripeProduct.active,
        });
      } catch (error) {
        console.warn(
          `Failed to fetch Stripe data for mapping ${mapping.id}:`,
          error instanceof Error ? error.message : 'Unknown error',
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
      throw new NotFoundException('Package not found');
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
        throw new NotFoundException('No active price found for package');
      }

      const stripePrice = prices.data[0];
      const metadata = mapping.metadata || {};

      return {
        id: mapping.id,
        name: String(metadata.name) || stripeProduct.name,
        serviceType: String(metadata.service_type) || 'PRIVATE',
        credits: Number(metadata.credits) || 0,
        creditUnitMinutes: Number(metadata.credit_unit_minutes) || 30,
        teacherTier: ((): number | null => {
          const raw = metadata.teacher_tier;
          if (raw === undefined || raw === null || raw === '') return null;
          const n =
            typeof raw === 'string' ? parseInt(raw, 10) : (raw as number);
          return Number.isFinite(n) ? n : null;
        })(),
        expiresInDays: Number(metadata.expires_in_days) || null,
        stripe: {
          productId: stripeProduct.id,
          priceId: stripePrice.id,
          lookupKey: stripePrice.lookup_key || mapping.serviceKey,
          unitAmount: stripePrice.unit_amount || 0,
          currency: stripePrice.currency || 'usd',
        },
        active: mapping.active && stripeProduct.active,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error
          ? `Failed to fetch package: ${error.message}`
          : 'Unknown error',
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
      throw new NotFoundException('Package not found');
    }

    // Deactivate in our database (we don't delete Stripe products)
    mapping.active = false;
    await this.stripeProductMapRepository.save(mapping);
  }

  private generateLookupKey(dto: CreatePackageDto): string {
    const sanitizedName = dto.name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);

    return `${dto.serviceType}_CREDITS_${dto.credits}_${dto.creditUnitMinutes}MIN_${sanitizedName}_${dto.currency.toUpperCase()}`;
  }

  // NEW CREDIT-BASED METHODS (added alongside)
  async getActivePackagesForStudent(studentId: number) {
    const pkgs = await this.pkgRepo.find({
      where: { studentId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
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
            typeof raw === 'string'
              ? parseInt(raw, 10)
              : (raw as number | undefined);
          return Number.isFinite(n) ? (n as number) : null;
        })(),
        serviceType: (pkg.metadata?.service_type as string) || 'PRIVATE',
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
  ) {
    const pkg = await this.pkgRepo.findOne({
      where: { id: packageId, studentId },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    if (pkg.remainingSessions <= 0)
      throw new BadRequestException('No remaining credits');

    // Check if package is expired
    if (pkg.expiresAt && pkg.expiresAt <= new Date()) {
      throw new BadRequestException('Package has expired');
    }

    return await this.pkgRepo.manager.transaction(async (tx) => {
      // Lock and re-fetch inside transaction with pessimistic lock
      const locked = await tx.findOne(StudentPackage, {
        where: { id: packageId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) throw new NotFoundException('Package not found');
      if (locked.remainingSessions <= 0)
        throw new BadRequestException('No remaining credits');

      locked.remainingSessions = locked.remainingSessions - 1;
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
}
