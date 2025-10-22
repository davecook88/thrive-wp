import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import { Student } from "../../students/entities/student.entity.js";
import { PackageUse } from "./package-use.entity.js";
import { StripeProductMap } from "../../payments/entities/stripe-product-map.entity.js";

@Entity("student_package")
@Index(["studentId"])
@Index(["stripeProductMapId"])
export class StudentPackage extends BaseEntity {
  @Column({ name: "student_id", type: "int" })
  studentId: number;

  @ManyToOne(() => Student, { onDelete: "CASCADE" })
  @JoinColumn({ name: "student_id" })
  student: Student;

  @Column({ name: "stripe_product_map_id", type: "int", nullable: false })
  stripeProductMapId: number;

  @ManyToOne(() => StripeProductMap, { onDelete: "SET NULL" })
  @JoinColumn({ name: "stripe_product_map_id" })
  stripeProductMap: StripeProductMap;

  @Column({ name: "package_name", type: "varchar", length: 255 })
  packageName: string;

  @Column({ name: "total_sessions", type: "int", default: 0 })
  totalSessions: number;

  @Column({ name: "purchased_at", type: "datetime", precision: 3 })
  purchasedAt: Date;

  @Column({
    name: "expires_at",
    type: "datetime",
    precision: 3,
    nullable: true,
  })
  expiresAt: Date | null;

  @Column({
    name: "source_payment_id",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  sourcePaymentId: string | null;

  @Column({ name: "metadata", type: "json", nullable: true })
  metadata: Record<string, string | number | boolean | undefined> | null;

  /**
   * PackageUse records track how this package's credits have been consumed.
   * This relation is used to compute remaining credits.
   * Single source of truth: balances are computed from these uses.
   */
  @OneToMany(() => PackageUse, (use) => use.studentPackage, {
    eager: false,
    cascade: false,
  })
  uses?: PackageUse[];
}
