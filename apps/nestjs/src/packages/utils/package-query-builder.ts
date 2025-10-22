import { SelectQueryBuilder, Repository, IsNull } from "typeorm";
import { StripeProductMap, ScopeType } from "../../payments/entities/stripe-product-map.entity.js";
import { StudentPackage } from "../entities/student-package.entity.js";
import { PackageUse } from "../entities/package-use.entity.js";
import { ServiceType } from "../../common/types/class-types.js";

/**
 * Helper class for building queries for packages and their related data.
 */
export class PackageQueryBuilder {
  /**
   * Build a query for StripeProductMap with allowances loaded.
   * Use this for fetching package definitions.
   */
  static buildPackageMappingQuery(
    repo: Repository<StripeProductMap>,
  ): SelectQueryBuilder<StripeProductMap> {
    return repo
      .createQueryBuilder("spm")
      .leftJoinAndSelect("spm.allowances", "allowances")
      .where("spm.scope_type = :scopeType", { scopeType: ScopeType.PACKAGE })
      .andWhere("spm.deleted_at IS NULL");
  }

  /**
   * Build a query for active package mappings with allowances.
   */
  static buildActivePackageMappingQuery(
    repo: Repository<StripeProductMap>,
  ): SelectQueryBuilder<StripeProductMap> {
    return this.buildPackageMappingQuery(repo)
      .andWhere("spm.active = :active", { active: true });
  }

  /**
   * Build a query for packages matching a session type.
   * Filters allowances to those matching the service type.
   */
  static buildPackagesForSessionTypeQuery(
    repo: Repository<StripeProductMap>,
    sessionServiceType: ServiceType,
  ): SelectQueryBuilder<StripeProductMap> {
    return repo
      .createQueryBuilder("spm")
      .leftJoinAndSelect("spm.allowances", "allowances")
      .where("spm.scope_type = :scopeType", { scopeType: ScopeType.PACKAGE })
      .andWhere("spm.active = :active", { active: true })
      .andWhere("spm.deleted_at IS NULL")
      .andWhere("allowances.service_type = :serviceType", {
        serviceType: sessionServiceType,
      })
      .andWhere("allowances.deleted_at IS NULL");
  }

  /**
   * Build a query for student packages with all related uses loaded.
   * Include only active packages (not expired, has credits).
   */
  static buildActiveStudentPackagesQuery(
    repo: Repository<StudentPackage>,
    studentId: number,
  ): SelectQueryBuilder<StudentPackage> {
    return repo
      .createQueryBuilder("sp")
      .leftJoinAndSelect("sp.uses", "uses", "uses.deleted_at IS NULL")
      .where("sp.student_id = :studentId", { studentId })
      .andWhere("sp.deleted_at IS NULL")
      .andWhere(
        "(sp.expires_at IS NULL OR sp.expires_at > NOW())",
      );
  }

  /**
   * Build a query for a specific student package with uses loaded.
   * Used when we need to compute remaining credits.
   */
  static buildStudentPackageWithUsesQuery(
    repo: Repository<StudentPackage>,
    studentId: number,
    packageId: number,
  ): SelectQueryBuilder<StudentPackage> {
    return repo
      .createQueryBuilder("sp")
      .leftJoinAndSelect("sp.uses", "uses", "uses.deleted_at IS NULL")
      .where("sp.id = :packageId", { packageId })
      .andWhere("sp.student_id = :studentId", { studentId })
      .andWhere("sp.deleted_at IS NULL");
  }

  /**
   * Load all PackageUse records for a package to compute balances.
   */
  static async loadPackageUses(
    useRepo: Repository<PackageUse>,
    packageId: number,
  ): Promise<PackageUse[]> {
    return useRepo.find({
      where: {
        studentPackageId: packageId,
        deletedAt: IsNull(),
      },
      order: {
        usedAt: "DESC",
      },
    });
  }

  /**
   * Load all PackageUse records for a package filtered by service type.
   */
  static async loadPackageUsesByServiceType(
    useRepo: Repository<PackageUse>,
    packageId: number,
    serviceType: ServiceType,
  ): Promise<PackageUse[]> {
    return useRepo.find({
      where: {
        studentPackageId: packageId,
        serviceType,
        deletedAt: IsNull(),
      },
      order: {
        usedAt: "DESC",
      },
    });
  }
}
