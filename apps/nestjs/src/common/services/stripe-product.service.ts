import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

export interface CreateStripeProductOptions {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreateStripePriceOptions {
  productId: string;
  amountMinor: number;
  currency?: string;
  lookupKey?: string;
  metadata?: Record<string, string>;
}

export interface StripeProductResult {
  product: Stripe.Product;
  price: Stripe.Price;
}

/**
 * Centralized service for Stripe product and price creation
 * Used by PackagesService and CourseProgramsService
 */
@Injectable()
export class StripeProductService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>("stripe.secretKey");
    if (!secretKey) {
      throw new Error("Stripe secret key is not configured");
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil",
    });
  }

  /**
   * Get Stripe instance (for direct API calls if needed)
   */
  getStripeClient(): Stripe {
    return this.stripe;
  }

  /**
   * Create a Stripe product
   */
  async createProduct(
    options: CreateStripeProductOptions,
  ): Promise<Stripe.Product> {
    try {
      return await this.stripe.products.create({
        name: options.name,
        description: options.description,
        type: "service",
        metadata: options.metadata || {},
      });
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(`Stripe error: ${error.message}`);
      }
      throw new BadRequestException(
        `Failed to create Stripe product: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create a Stripe price for a product
   */
  async createPrice(options: CreateStripePriceOptions): Promise<Stripe.Price> {
    try {
      return await this.stripe.prices.create({
        product: options.productId,
        unit_amount: options.amountMinor,
        currency: (options.currency || "usd").toLowerCase(),
        lookup_key: options.lookupKey,
        metadata: options.metadata || {},
      });
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(`Stripe error: ${error.message}`);
      }
      throw new BadRequestException(
        `Failed to create Stripe price: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create both product and price in one operation
   */
  async createProductWithPrice(
    productOptions: CreateStripeProductOptions,
    priceOptions: Omit<CreateStripePriceOptions, "productId">,
  ): Promise<StripeProductResult> {
    const product = await this.createProduct(productOptions);
    const price = await this.createPrice({
      ...priceOptions,
      productId: product.id,
    });

    return { product, price };
  }

  /**
   * Retrieve a Stripe product
   */
  async getProduct(productId: string): Promise<Stripe.Product> {
    try {
      return await this.stripe.products.retrieve(productId);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(`Stripe error: ${error.message}`);
      }
      throw new BadRequestException(
        `Failed to retrieve Stripe product: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * List prices for a product
   */
  async listPrices(
    productId: string,
    activeOnly = true,
  ): Promise<Stripe.Price[]> {
    try {
      const prices = await this.stripe.prices.list({
        product: productId,
        active: activeOnly,
        limit: 100,
      });
      return prices.data;
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(`Stripe error: ${error.message}`);
      }
      throw new BadRequestException(
        `Failed to list Stripe prices: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Update a Stripe product
   */
  async updateProduct(
    productId: string,
    updates: Partial<CreateStripeProductOptions>,
  ): Promise<Stripe.Product> {
    try {
      return await this.stripe.products.update(productId, {
        name: updates.name,
        description: updates.description,
        metadata: updates.metadata,
      });
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(`Stripe error: ${error.message}`);
      }
      throw new BadRequestException(
        `Failed to update Stripe product: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
