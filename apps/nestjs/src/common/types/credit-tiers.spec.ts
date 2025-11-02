import { describe, it, expect } from "vitest";
import {
  SERVICE_TYPE_BASE_TIERS,
  getSessionTier,
  getPackageTier,
  canUsePackageForSession,
  getPackageDisplayLabel,
  isCrossTierBooking,
  getCrossTierWarningMessage,
  calculateCreditsRequired,
  hasDurationMismatch,
  getDurationMismatchWarning,
} from "./credit-tiers.js";
import { ServiceType } from "./class-types.js";
import type { Session } from "../../sessions/entities/session.entity.js";
import type { StudentPackage } from "../../packages/entities/student-package.entity.js";
import { PackageAllowance } from "@/entities.js";

describe("Credit Tier System", () => {
  // Mock session factory
  const createMockSession = (
    type: ServiceType,
    teacherTier: number = 0,
  ): Partial<Session> => ({
    id: 1,
    type,
    startAt: new Date("2025-01-01T10:00:00Z"),
    endAt: new Date("2025-01-01T11:00:00Z"),
    teacher: {
      id: 1,
      userId: 1,
      bio: "Test Teacher Bio",
      isActive: true,
      tier: teacherTier,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: undefined,
      user: {
        id: 1,
        email: "teacher@test.com",
        firstName: "Test",
        lastName: "Teacher",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: undefined,
        admin: null,
        passwordHash: "",
      } as unknown as Session["teacher"]["user"],
    } as unknown as Session["teacher"],
  });

  // Mock package factory (legacy - uses old metadata structure)
  const createMockPackage = (
    serviceType: ServiceType,
    teacherTier: number = 0,
    durationMinutes: number = 60,
  ): Partial<StudentPackage> => ({
    id: 1,
    studentId: 1,
    packageName: "Test Package",
    totalSessions: 10,
    purchasedAt: new Date(),
    expiresAt: new Date("2025-12-31"),
    stripeProductMapId: 1,
    stripeProductMap: {
      id: 1,
      serviceKey: "test_product",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: undefined,
      active: true,
      stripeProductId: "prod_test",
      allowances: [
        {
          id: 1,
          serviceType,
          teacherTier,
          credits: 10,
          creditUnitMinutes: durationMinutes as 15 | 30 | 45 | 60,
          stripeProductMapId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as PackageAllowance,
      ],
    },
    metadata: {
      service_type: serviceType,
      teacher_tier: String(teacherTier),
      duration_minutes: String(durationMinutes),
    },
  });

  describe("SERVICE_TYPE_BASE_TIERS", () => {
    it("should have correct base tier values", () => {
      expect(SERVICE_TYPE_BASE_TIERS[ServiceType.PRIVATE]).toBe(100);
      expect(SERVICE_TYPE_BASE_TIERS[ServiceType.GROUP]).toBe(50);
      expect(SERVICE_TYPE_BASE_TIERS[ServiceType.COURSE]).toBe(0);
    });
  });

  describe("getSessionTier", () => {
    it("should calculate tier for private session with standard teacher", () => {
      const session = createMockSession(ServiceType.PRIVATE, 0) as Session;
      expect(getSessionTier(session)).toBe(100);
    });

    it("should calculate tier for private session with premium teacher", () => {
      const session = createMockSession(ServiceType.PRIVATE, 10) as Session;
      expect(getSessionTier(session)).toBe(110);
    });

    it("should calculate tier for group session with standard teacher", () => {
      const session = createMockSession(ServiceType.GROUP, 0) as Session;
      expect(getSessionTier(session)).toBe(50);
    });

    it("should calculate tier for group session with premium teacher", () => {
      const session = createMockSession(ServiceType.GROUP, 5) as Session;
      expect(getSessionTier(session)).toBe(55);
    });

    it("should calculate tier for course session", () => {
      const session = createMockSession(ServiceType.COURSE, 0) as Session;
      expect(getSessionTier(session)).toBe(0);
    });

    it("should handle missing teacher gracefully", () => {
      const session = {
        ...createMockSession(ServiceType.PRIVATE, 0),
        teacher: undefined,
      } as unknown as Session;
      expect(getSessionTier(session)).toBe(100);
    });
  });

  describe("getPackageTier", () => {
    it("should calculate tier for private package with standard teacher", () => {
      const pkg = createMockPackage(ServiceType.PRIVATE, 0) as StudentPackage;
      expect(getPackageTier(pkg)).toBe(100);
    });

    it("should calculate tier for private package with premium teacher", () => {
      const pkg = createMockPackage(ServiceType.PRIVATE, 10) as StudentPackage;
      expect(getPackageTier(pkg)).toBe(110);
    });

    it("should calculate tier for group package", () => {
      const pkg = createMockPackage(ServiceType.GROUP, 0) as StudentPackage;
      expect(getPackageTier(pkg)).toBe(50);
    });

    it("should handle missing metadata gracefully", () => {
      const pkg = {
        ...createMockPackage(ServiceType.PRIVATE, 0),
        metadata: null,
      } as StudentPackage;
      expect(getPackageTier(pkg)).toBe(100); // Default to PRIVATE
    });

    it("should handle numeric teacher tier in metadata", () => {
      const pkg = {
        ...createMockPackage(ServiceType.PRIVATE, 5),
      } as StudentPackage;
      expect(getPackageTier(pkg)).toBe(105);
    });

    it("should handle invalid teacher tier gracefully", () => {
      const pkg = {
        ...createMockPackage(ServiceType.PRIVATE, 0),
        metadata: {
          service_type: ServiceType.PRIVATE,
          teacher_tier: "invalid",
        },
      } as StudentPackage;
      expect(getPackageTier(pkg)).toBe(100);
    });
  });

  describe("canUsePackageForSession", () => {
    it("should allow private package for private session (equal tier)", () => {
      const pkg = createMockPackage(ServiceType.PRIVATE, 0) as StudentPackage;
      const session = createMockSession(ServiceType.PRIVATE, 0) as Session;
      const result = canUsePackageForSession({ pkg, session });
      expect(result.canUse).toBe(true);
      expect(result.allowance).toBeTruthy();
    });

    it("should allow private package for group session (higher tier)", () => {
      const pkg = createMockPackage(ServiceType.PRIVATE, 0) as StudentPackage;
      const session = createMockSession(ServiceType.GROUP, 0) as Session;
      const result = canUsePackageForSession({ pkg, session });
      expect(result.canUse).toBe(true);
      expect(result.allowance).toBeTruthy();
    });

    it("should NOT allow group package for private session (lower tier)", () => {
      const pkg = createMockPackage(ServiceType.GROUP, 0) as StudentPackage;
      const session = createMockSession(ServiceType.PRIVATE, 0) as Session;
      const result = canUsePackageForSession({ pkg, session });
      expect(result.canUse).toBe(false);
      expect(result.allowance).toBeNull();
    });

    it("should NOT allow any package for course session", () => {
      const pkg = createMockPackage(ServiceType.PRIVATE, 0) as StudentPackage;
      const session = createMockSession(ServiceType.COURSE, 0) as Session;
      const result = canUsePackageForSession({ pkg, session });
      expect(result.canUse).toBe(false);
      expect(result.allowance).toBeNull();
    });

    it("should allow premium private package for standard private session", () => {
      const pkg = createMockPackage(ServiceType.PRIVATE, 10) as StudentPackage;
      const session = createMockSession(ServiceType.PRIVATE, 0) as Session;
      const result = canUsePackageForSession({ pkg, session });
      expect(result.canUse).toBe(true);
      expect(result.allowance).toBeTruthy();
    });

    it("should NOT allow standard private package for premium private session", () => {
      const pkg = createMockPackage(ServiceType.PRIVATE, 0) as StudentPackage;
      const session = createMockSession(ServiceType.PRIVATE, 10) as Session;
      const result = canUsePackageForSession({ pkg, session });
      expect(result.canUse).toBe(false);
      expect(result.allowance).toBeNull();
    });
  });

  describe("getPackageDisplayLabel", () => {
    it('should return "Private Credit" for standard private package', () => {
      const pkg = createMockPackage(ServiceType.PRIVATE, 0) as StudentPackage;
      expect(getPackageDisplayLabel(pkg)).toBe("Private Credit");
    });

    it('should return "Premium Private Credit" for premium private package', () => {
      const pkg = createMockPackage(ServiceType.PRIVATE, 10) as StudentPackage;
      expect(getPackageDisplayLabel(pkg)).toBe("Premium Private Credit");
    });

    it('should return "Group Credit" for standard group package', () => {
      const pkg = createMockPackage(ServiceType.GROUP, 0) as StudentPackage;
      expect(getPackageDisplayLabel(pkg)).toBe("Group Credit");
    });

    it('should return "Premium Group Credit" for premium group package', () => {
      const pkg = createMockPackage(ServiceType.GROUP, 5) as StudentPackage;
      expect(getPackageDisplayLabel(pkg)).toBe("Premium Group Credit");
    });

    it('should return "Course Credit" for course package', () => {
      const pkg = createMockPackage(ServiceType.COURSE, 0) as StudentPackage;
      expect(getPackageDisplayLabel(pkg)).toBe("Course Credit");
    });

    it("should handle missing metadata", () => {
      const pkg = {
        ...createMockPackage(ServiceType.PRIVATE, 0),
        metadata: null,
      } as StudentPackage;
      expect(getPackageDisplayLabel(pkg)).toBe("Private Credit");
    });
  });

  describe("isCrossTierBooking", () => {
    it("should return true when using private credit for group session", () => {
      const pkg = createMockPackage(ServiceType.PRIVATE, 0) as StudentPackage;
      const session = createMockSession(ServiceType.GROUP, 0) as Session;
      const result = isCrossTierBooking(pkg, session);
      expect(result.isCrossTier).toBe(true);
      expect(result.allowance).toBeTruthy();
    });

    it("should return false when using private credit for private session", () => {
      const pkg = createMockPackage(ServiceType.PRIVATE, 0) as StudentPackage;
      const session = createMockSession(ServiceType.PRIVATE, 0) as Session;
      const result = isCrossTierBooking(pkg, session);
      expect(result.isCrossTier).toBe(false);
      expect(result.allowance).toBeTruthy();
    });

    it("should return false when using group credit for group session", () => {
      const pkg = createMockPackage(ServiceType.GROUP, 0) as StudentPackage;
      const session = createMockSession(ServiceType.GROUP, 0) as Session;
      const result = isCrossTierBooking(pkg, session);
      expect(result.isCrossTier).toBe(false);
      expect(result.allowance).toBeTruthy();
    });

    it("should return false for invalid tier combinations", () => {
      const pkg = createMockPackage(ServiceType.GROUP, 0) as StudentPackage;
      const session = createMockSession(ServiceType.PRIVATE, 0) as Session;
      // Can't use group for private, so not a valid cross-tier booking
      const result = isCrossTierBooking(pkg, session);
      expect(result.isCrossTier).toBe(false);
      expect(result.allowance).toBeNull();
    });

    it("should return true when using premium private for standard private", () => {
      const pkg = createMockPackage(ServiceType.PRIVATE, 10) as StudentPackage;
      const session = createMockSession(ServiceType.PRIVATE, 0) as Session;
      const result = isCrossTierBooking(pkg, session);
      expect(result.isCrossTier).toBe(true);
      expect(result.allowance).toBeTruthy();
    });
  });

  describe("getCrossTierWarningMessage", () => {
    it("should return warning message for private credit used for group class", () => {
      const pkg = createMockPackage(ServiceType.PRIVATE, 0) as StudentPackage;
      const session = createMockSession(ServiceType.GROUP, 0) as Session;
      const message = getCrossTierWarningMessage(pkg, session);
      expect(message).toContain("Private Credit");
      expect(message).toContain("group class");
    });

    it("should return null for same-tier booking", () => {
      const pkg = createMockPackage(ServiceType.PRIVATE, 0) as StudentPackage;
      const session = createMockSession(ServiceType.PRIVATE, 0) as Session;
      expect(getCrossTierWarningMessage(pkg, session)).toBeNull();
    });

    it("should return warning for premium private used for standard private", () => {
      const pkg = createMockPackage(ServiceType.PRIVATE, 10) as StudentPackage;
      const session = createMockSession(ServiceType.PRIVATE, 0) as Session;
      const message = getCrossTierWarningMessage(pkg, session);
      expect(message).toContain("Premium Private Credit");
      expect(message).toContain("private class");
    });
  });

  describe("calculateCreditsRequired", () => {
    it("should return 1 for exact match (60 min session, 60 min credit)", () => {
      expect(calculateCreditsRequired(60, 60)).toBe(1);
    });

    it("should return 2 for double duration (60 min session, 30 min credit)", () => {
      expect(calculateCreditsRequired(60, 30)).toBe(2);
    });

    it("should round up for partial credit (45 min session, 60 min credit)", () => {
      expect(calculateCreditsRequired(45, 60)).toBe(1);
    });

    it("should round up for partial credit (90 min session, 60 min credit)", () => {
      expect(calculateCreditsRequired(90, 60)).toBe(2);
    });

    it("should handle 30 min credit unit correctly", () => {
      expect(calculateCreditsRequired(30, 30)).toBe(1);
      expect(calculateCreditsRequired(45, 30)).toBe(2); // rounds up
      expect(calculateCreditsRequired(60, 30)).toBe(2);
      expect(calculateCreditsRequired(90, 30)).toBe(3);
    });

    it("should handle edge case of 1 minute over", () => {
      expect(calculateCreditsRequired(61, 60)).toBe(2);
    });
  });

  describe("hasDurationMismatch", () => {
    it("should return false for exact match", () => {
      expect(hasDurationMismatch(60, 60)).toBe(false);
    });

    it("should return true for mismatch (session shorter than credit)", () => {
      expect(hasDurationMismatch(30, 60)).toBe(true);
    });

    it("should return true for mismatch (session longer than credit)", () => {
      expect(hasDurationMismatch(90, 60)).toBe(true);
    });

    it("should return true for any non-exact match", () => {
      expect(hasDurationMismatch(45, 30)).toBe(true);
    });
  });

  describe("getDurationMismatchWarning", () => {
    it("should return null for exact match", () => {
      expect(getDurationMismatchWarning(60, 60)).toBeNull();
    });

    it("should warn about unused minutes when session is shorter", () => {
      const warning = getDurationMismatchWarning(30, 60);
      expect(warning).toContain("30 minutes");
      expect(warning).toContain("60 minutes");
      expect(warning).toContain("30 minutes will not be saved");
    });

    it("should warn about multiple credits when session is longer", () => {
      const warning = getDurationMismatchWarning(90, 60);
      expect(warning).toContain("2");
      expect(warning).toContain("60-minute credits");
      expect(warning).toContain("90 minutes");
    });

    it("should handle 30-min credit for 60-min session", () => {
      const warning = getDurationMismatchWarning(60, 30);
      expect(warning).toContain("2");
      expect(warning).toContain("30-minute credits");
    });

    it("should handle partial credit usage correctly", () => {
      const warning = getDurationMismatchWarning(45, 60);
      expect(warning).toContain("1 credit");
      expect(warning).toContain("15 minutes will not be saved");
    });
  });

  describe("Integration scenarios", () => {
    it("Scenario: Student uses private credit for group class", () => {
      const privatePackage = createMockPackage(
        ServiceType.PRIVATE,
        0,
        60,
      ) as StudentPackage;
      const groupSession = createMockSession(ServiceType.GROUP, 0) as Session;

      const canUseResult = canUsePackageForSession({
        pkg: privatePackage,
        session: groupSession,
      });
      expect(canUseResult.canUse).toBe(true);

      const crossTierResult = isCrossTierBooking(privatePackage, groupSession);
      expect(crossTierResult.isCrossTier).toBe(true);

      expect(
        getCrossTierWarningMessage(privatePackage, groupSession),
      ).toContain("Private Credit");
      expect(calculateCreditsRequired(60, 60)).toBe(1);
    });

    it("Scenario: Student tries to use group credit for private class", () => {
      const groupPackage = createMockPackage(
        ServiceType.GROUP,
        0,
        60,
      ) as StudentPackage;
      const privateSession = createMockSession(
        ServiceType.PRIVATE,
        0,
      ) as Session;

      const result = canUsePackageForSession({
        pkg: groupPackage,
        session: privateSession,
      });
      expect(result.canUse).toBe(false);
    });

    it("Scenario: 60-min credit for 30-min session", () => {
      const pkg = createMockPackage(
        ServiceType.PRIVATE,
        0,
        60,
      ) as StudentPackage;
      const session = {
        ...createMockSession(ServiceType.PRIVATE, 0),
        startAt: new Date("2025-01-01T10:00:00Z"),
        endAt: new Date("2025-01-01T10:30:00Z"),
      } as Session;

      const result = canUsePackageForSession({ pkg, session });
      expect(result.canUse).toBe(true);
      expect(calculateCreditsRequired(30, 60)).toBe(1); // Uses 1 credit, wastes 30 min
      expect(hasDurationMismatch(30, 60)).toBe(true);
      expect(getDurationMismatchWarning(30, 60)).toContain(
        "30 minutes will not be saved",
      );
    });

    it("Scenario: 30-min credit for 60-min session", () => {
      const pkg = createMockPackage(
        ServiceType.PRIVATE,
        0,
        30,
      ) as StudentPackage;
      const session = createMockSession(ServiceType.PRIVATE, 0) as Session;

      const result = canUsePackageForSession({ pkg, session });
      expect(result.canUse).toBe(true);
      expect(calculateCreditsRequired(60, 30)).toBe(2); // Requires 2 credits
      expect(hasDurationMismatch(60, 30)).toBe(true);
      expect(getDurationMismatchWarning(60, 30)).toContain("2");
    });

    it("Scenario: Premium teacher requires premium package", () => {
      const standardPackage = createMockPackage(
        ServiceType.PRIVATE,
        0,
      ) as StudentPackage;
      const premiumSession = createMockSession(
        ServiceType.PRIVATE,
        10,
      ) as Session;

      const result = canUsePackageForSession({
        pkg: standardPackage,
        session: premiumSession,
      });
      expect(result.canUse).toBe(false);
    });

    it("Scenario: Premium package can book standard teacher", () => {
      const premiumPackage = createMockPackage(
        ServiceType.PRIVATE,
        10,
      ) as StudentPackage;
      const standardSession = createMockSession(
        ServiceType.PRIVATE,
        0,
      ) as Session;

      const canUseResult = canUsePackageForSession({
        pkg: premiumPackage,
        session: standardSession,
      });
      expect(canUseResult.canUse).toBe(true);

      const crossTierResult = isCrossTierBooking(
        premiumPackage,
        standardSession,
      );
      expect(crossTierResult.isCrossTier).toBe(true);
    });
  });
});
