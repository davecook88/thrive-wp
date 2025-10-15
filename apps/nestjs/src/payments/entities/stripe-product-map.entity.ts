import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";

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
      "Human-readable key like PRIVATE_CLASS, GROUP_CLASS, COURSE_CLASS, or COURSE:123",
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
    comment: "Additional metadata from Stripe",
  })
  metadata?: Record<string, string | number | boolean | undefined> | null;
}
