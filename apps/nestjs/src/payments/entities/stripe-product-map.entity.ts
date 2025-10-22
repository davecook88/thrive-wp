import { Entity, Column, OneToMany, Index } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { PackageAllowance } from "../../packages/entities/package-allowance.entity.js";

export enum ScopeType {
  COURSE = "course",
  SESSION = "session",
  PACKAGE = "package",
  SERVICE = "service",
}

/**
 * Maps service keys to Stripe products.
 * Serves as the minimal local mapping between human-readable keys and Stripe products.
 * Prices are fetched dynamically from Stripe when needed.
 *
 * For bundle packages, this maps to a single Stripe product that contains multiple
 * allowances (one per service type). Allowances define the contents of the bundle.
 */
@Entity("stripe_product_map")
@Index(["serviceKey"], { unique: true })
@Index(["stripeProductId"], { unique: true })
@Index(["active"])
@Index(["scopeType", "scopeId"])
export class StripeProductMap extends BaseEntity {
  @Column({
    name: "service_key",
    type: "varchar",
    length: 120,
    comment:
      "Human-readable key like PRIVATE_CLASS, GROUP_CLASS, COURSE_CLASS, BUNDLE_PREMIUM, or COURSE:123",
  })
  serviceKey: string;

  @Column({
    name: "stripe_product_id",
    type: "varchar",
    length: 64,
    comment: "Stripe Product ID",
  })
  stripeProductId: string;

  @Column({
    name: "active",
    type: "boolean",
    default: true,
    comment: "Whether mapping is active",
  })
  active: boolean;

  @Column({
    name: "scope_type",
    type: "enum",
    enum: ScopeType,
    nullable: true,
    comment: "Optional type classification",
  })
  scopeType?: ScopeType;

  @Column({
    name: "scope_id",
    type: "int",
    nullable: true,
    comment: "Optional reference to internal ID",
  })
  scopeId?: number;

  @Column({
    name: "metadata",
    type: "json",
    nullable: true,
    comment:
      "Additional metadata from Stripe, including allowances array for bundles",
  })
  metadata?: Record<string, string | number | boolean | undefined> | null;

  /**
   * Package allowances define what's included in this bundle.
   * For single-service products, there's one allowance.
   * For multi-service bundles, there can be multiple allowances.
   */
  @OneToMany(
    () => PackageAllowance,
    (allowance) => allowance.stripeProductMap,
    {
      eager: true,
      cascade: true,
    },
  )
  allowances: PackageAllowance[] = [];
}
