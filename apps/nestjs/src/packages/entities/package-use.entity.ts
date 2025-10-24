import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity.js";
import type { StudentPackage } from "./student-package.entity.js";
import type { PackageAllowance } from "./package-allowance.entity.js";
import { ServiceType } from "../../common/types/class-types.js";

@Entity("package_use")
@Index(["studentPackageId"])
@Index(["allowanceId"])
export class PackageUse extends BaseEntity {
  @Column({ name: "student_package_id", type: "int" })
  studentPackageId: number;

  @ManyToOne("StudentPackage", { onDelete: "CASCADE" })
  @JoinColumn({ name: "student_package_id" })
  studentPackage: StudentPackage;

  @Column({
    name: "allowance_id",
    type: "int",
    nullable: true,
    comment: "Which specific allowance within the package was used",
  })
  allowanceId: number | null;

  @ManyToOne("PackageAllowance", { onDelete: "CASCADE" })
  @JoinColumn({ name: "allowance_id" })
  allowance: PackageAllowance | null;

  @Column({ name: "booking_id", type: "int", nullable: true })
  bookingId: number | null;

  @Column({ name: "session_id", type: "int", nullable: true })
  sessionId: number | null;

  @Column({
    name: "service_type",
    type: "enum",
    enum: ServiceType,
    nullable: true,
    comment: "Which service type balance was used (PRIVATE, GROUP, COURSE)",
  })
  serviceType?: ServiceType | null;

  @Column({
    name: "credits_used",
    type: "int",
    default: 1,
    comment: "How many credits were consumed (typically 1, but can be higher)",
  })
  creditsUsed: number = 1;

  @Column({ name: "used_at", type: "datetime", precision: 3 })
  usedAt: Date;

  @Column({ name: "used_by", type: "int", nullable: true })
  usedBy: number | null;

  @Column({ name: "note", type: "varchar", length: 500, nullable: true })
  note: string | null;
}
