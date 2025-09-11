import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { CreatePackageDto } from './dto/create-package.dto.js';
import { PackageResponseDto } from './dto/package-response.dto.js';
import { StripeProductMap, ScopeType } from '../payments/entities/stripe-product-map.entity.js';

@Injectable()
export class PackagesService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(StripeProductMap)
    private stripeProductMapRepository: Repository<StripeProductMap>,
    private configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    if (!secretKey) {
      throw new Error('Stripe secret key is not configured');
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil',
    });
  }

  async createPackage(createPackageDto: CreatePackageDto): Promise<PackageResponseDto> {
    try {
      // Generate lookup key if not provided
      const lookupKey = createPackageDto.lookupKey || 
        this.generateLookupKey(createPackageDto);

      // Check if lookup key already exists
      const existingMapping = await this.stripeProductMapRepository.findOne({
        where: { serviceKey: lookupKey },
      });

      if (existingMapping) {
        throw new BadRequestException(`Lookup key "${lookupKey}" already exists`);
      }

      // Create Stripe Product
      const stripeProduct = await this.stripe.products.create({
        name: createPackageDto.name,
        description: createPackageDto.description,
        type: 'service',
        metadata: {
          offering_type: 'PACKAGE',
          service_type: createPackageDto.serviceType,
          credits: createPackageDto.credits.toString(),
          credit_unit_minutes: createPackageDto.creditUnitMinutes.toString(),
          expires_in_days: createPackageDto.expiresInDays?.toString() || '',
          scope: createPackageDto.scope,
        },
      });

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
          lookup_key: lookupKey,
        },
      });

      const savedMapping = await this.stripeProductMapRepository.save(productMapping);

      return {
        id: savedMapping.id,
        name: createPackageDto.name,
        serviceType: createPackageDto.serviceType,
        credits: createPackageDto.credits,
        creditUnitMinutes: createPackageDto.creditUnitMinutes,
        expiresInDays: createPackageDto.expiresInDays || null,
        stripe: {
          productId: stripeProduct.id,
          priceId: stripePrice.id,
          lookupKey: lookupKey,
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

      throw new BadRequestException(`Failed to create package: ${error.message}`);
    }
  }

  async getPackages(): Promise<PackageResponseDto[]> {
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
        const stripeProduct = await this.stripe.products.retrieve(mapping.stripeProductId);
        
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
          name: metadata.name || stripeProduct.name,
          serviceType: metadata.service_type || 'PRIVATE',
          credits: Number(metadata.credits) || 0,
          creditUnitMinutes: Number(metadata.credit_unit_minutes) || 30,
          expiresInDays: metadata.expires_in_days || null,
          stripe: {
            productId: stripeProduct.id,
            priceId: stripePrice.id,
            lookupKey: stripePrice.lookup_key || mapping.serviceKey,
          },
          active: mapping.active && stripeProduct.active,
        });
      } catch (error) {
        console.warn(`Failed to fetch Stripe data for mapping ${mapping.id}:`, error.message);
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
      const stripeProduct = await this.stripe.products.retrieve(mapping.stripeProductId);
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
        name: metadata.name || stripeProduct.name,
        serviceType: metadata.service_type || 'PRIVATE',
        credits: Number(metadata.credits) || 0,
        creditUnitMinutes: Number(metadata.credit_unit_minutes) || 30,
        expiresInDays: metadata.expires_in_days || null,
        stripe: {
          productId: stripeProduct.id,
          priceId: stripePrice.id,
          lookupKey: stripePrice.lookup_key || mapping.serviceKey,
        },
        active: mapping.active && stripeProduct.active,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to fetch package: ${error.message}`);
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
}