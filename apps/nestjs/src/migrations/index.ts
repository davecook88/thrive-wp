// This file exports all migrations as an array of classes
// This allows TypeORM to use them directly without dynamic imports
// which bypasses Vitest's transformation pipeline

export { InitialSchema1733770000000 } from "./1733770000000-InitialSchema.js";
export { AddPasswordHashToUsers1733771000001 } from "./1733771000001-AddPasswordHashToUsers.js";
export { AddTeacherAndAvailability1733772000002 } from "./1733772000002-AddTeacherAndAvailability.js";
export { AddAdminTable1756431459155 } from "./1756431459155-AddAdminTable.js";
export { AddStudentTable1756431459156 } from "./1756431459156-AddStudentTable.js";
export { AddSchedulingTables1756431459157 } from "./1756431459157-AddSchedulingTables.js";
export { AddWaitlistTable1756431459158 } from "./1756431459158-AddWaitlistTable.js";
export { AddPricingSystemTables1756431459159 } from "./1756431459159-AddPricingSystemTables.js";
export { RenameToStripeProductMap1756431459160 } from "./1756431459160-RenameToStripeProductMap.js";
export { AddDraftStatuses1756431459161 } from "./1756431459161-AddDraftStatuses.js";
export { AddStudentPackagesTables1759000000000 } from "./1759000000000-AddStudentPackagesTables.js";
export { AddPackageFieldsToBooking1759000000001 } from "./1759000000001-AddPackageFieldsToBooking.js";
export { AddCancellationPolicies1759000000002 } from "./1759000000002-AddCancellationPolicies.js";
export { AddGroupClassesTables1759000000003 } from "./1759000000003-AddGroupClassesTables.js";
export { AddTeacherProfileFields1759000000004 } from "./1759000000004-AddTeacherProfileFields.js";
export { GroupClassMultipleLevels1759000000005 } from "./1759000000005-GroupClassMultipleLevels.js";
export { AddCourseProgramsTables1760000000000 } from "./1760000000000-AddCourseProgramsTables.js";
export { AddServiceTypeAndTeacherTierToStripeProductMap1762000000000 } from "./1762000000000-AddServiceTypeAndTeacherTierToStripeProductMap.js";
export { BundlePackagesMigration1762000000010 } from "./1762000000010-BundlePackagesMigration.js";
export { AddStripeProductMapFKToStudentPackage1762000000020 } from "./1762000000020-AddStripeProductMapFKToStudentPackage.js";
export { AddPackageUseIdToBooking1762000000030 } from "./1762000000030-AddPackageUseIdToBooking.js";
