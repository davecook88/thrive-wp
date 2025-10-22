import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { StripeProductMap } from "../../payments/entities/stripe-product-map.entity.js";
import { ServiceType } from "@thrive/shared";

/**
 * PackageAllowance defines what credits are included in a bundle package.
 *
 * A single package can contain multiple allowances (one per service type).
 * Each allowance specifies:
 * - Service type (PRIVATE, GROUP, COURSE)
 * - Number of credits
 * - Credit duration (15, 30, 45, or 60 minutes)
 * - Teacher tier restriction (0 = any tier)
 *
 * Example: A bundle package might include:
 * - 5 PRIVATE credits @ 30 min each
 * - 3 GROUP credits @ 60 min each
 * - 2 COURSE credits @ no time restriction
 */
@Entity("package_allowance")
@Index(["stripeProductMapId"])
@Index(["serviceType"])
export class PackageAllowance extends BaseEntity {
  @Column({ name: "stripe_product_map_id", type: "int" })
  stripeProductMapId: number;

  @ManyToOne(() => StripeProductMap, (pm) => pm.allowances, {
    onDelete: "CASCADE",
    eager: false,
  })
  @JoinColumn({ name: "stripe_product_map_id" })
  stripeProductMap: StripeProductMap;

  @Column({
    name: "service_type",
    type: "enum",
    enum: ServiceType,
  })
  serviceType: ServiceType;

  @Column({
    name: "teacher_tier",
    type: "int",
    default: 0,
    comment: "Teacher tier restriction (0 = any)",
  })
  teacherTier: number = 0;

  @Column({
    name: "credits",
    type: "int",
    comment: "Number of credits of this type in bundle",
  })
  credits: number;

  @Column({
    name: "credit_unit_minutes",
    type: "int",
    comment: "Duration per credit: 15, 30, 45, or 60",
  })
  creditUnitMinutes: 15 | 30 | 45 | 60;
}
