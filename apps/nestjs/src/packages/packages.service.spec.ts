import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, DataSource, SelectQueryBuilder } from "typeorm";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PackagesService } from "./packages.service.js";
import { StripeProductMap } from "../payments/entities/stripe-product-map.entity.js";
import { StudentPackage } from "./entities/student-package.entity.js";
import { PackageUse } from "./entities/package-use.entity.js";
import { PackageAllowance } from "./entities/package-allowance.entity.js";
import { Student } from "../students/entities/student.entity.js";
import { Session } from "../sessions/entities/session.entity.js";
import { Booking } from "../payments/entities/booking.entity.js";
import { SessionsService } from "../sessions/services/sessions.service.js";
import { PackageQueryBuilder } from "./utils/package-query-builder.js";

describe("PackagesService", () => {
  let service: PackagesService;
  let packageRepo: Repository<StudentPackage>;
  let useRepo: Repository<PackageUse>;

  const mockStripeProductMapRepo = {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    setLock: vi.fn().mockReturnThis(),
    getOne: vi.fn(),
  };

  const mockPackageRepo = {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockAllowanceRepo = {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };

  const mockStudentRepo = {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };

  const mockUseRepo = {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };

  const mockSessionRepo = {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };

  const mockBookingRepo = {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackagesService,
        {
          provide: getRepositoryToken(StripeProductMap),
          useValue: mockStripeProductMapRepo,
        },
        {
          provide: ConfigService,
          useValue: { get: () => "sss_test_dummy" },
        },
        {
          provide: getRepositoryToken(StudentPackage),
          useValue: mockPackageRepo,
        },
        {
          provide: getRepositoryToken(PackageAllowance),
          useValue: mockAllowanceRepo,
        },
        {
          provide: getRepositoryToken(Student),
          useValue: mockStudentRepo,
        },
        {
          provide: getRepositoryToken(PackageUse),
          useValue: mockUseRepo,
        },
        {
          provide: getRepositoryToken(Session),
          useValue: mockSessionRepo,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepo,
        },
        {
          provide: SessionsService,
          useValue: {
            validatePrivateSession: vi.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<PackagesService>(PackagesService);
    packageRepo = module.get<Repository<StudentPackage>>(
      getRepositoryToken(StudentPackage),
    );
    useRepo = module.get<Repository<PackageUse>>(
      getRepositoryToken(PackageUse),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getActivePackagesForStudent", () => {
    it("should return active packages for a student", async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 86400000); // +1 day

      const mockPackages = [
        {
          id: 1,
          studentId: 1,
          packageName: "5-class pack",
          totalSessions: 5,
          remainingSessions: 3,
          purchasedAt: now,
          expiresAt: futureDate,
          sourcePaymentId: null,
          metadata: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          uses: [{ creditsUsed: 1 }, { creditsUsed: 1 }], // 2 credits used, so 5 - 2 = 3 remaining
        },
      ];

      // Mock the query builder chain
      const mockQueryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi
          .fn()
          .mockResolvedValue(mockPackages as unknown as StudentPackage[]),
      };

      vi.spyOn(packageRepo, "createQueryBuilder").mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<StudentPackage>,
      );

      const result = await service.getActivePackagesForStudent(1);

      expect(result.packages).toHaveLength(1);
      expect(result.packages[0].remainingSessions).toBe(3);
      expect(result.totalRemaining).toBe(3);
      // New metadata-derived fields should exist (null when absent)
      expect(result.packages[0]).toHaveProperty("creditUnitMinutes");
      expect(result.packages[0]).toHaveProperty("teacherTier");
      expect(result.packages[0]).toHaveProperty("serviceType");
    });

    it("should filter out expired packages", async () => {
      // Mock the query builder chain - should return empty array for expired packages
      const mockQueryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]), // Query filters out expired packages
      };

      vi.spyOn(packageRepo, "createQueryBuilder").mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<StudentPackage>,
      );

      const result = await service.getActivePackagesForStudent(1);

      expect(result.packages).toHaveLength(0);
      expect(result.totalRemaining).toBe(0);
    });

    it("should filter out packages with no remaining sessions", async () => {
      const now = new Date();

      const mockPackages = [
        {
          id: 1,
          studentId: 1,
          packageName: "Used up pack",
          totalSessions: 5,
          remainingSessions: 0, // no sessions left
          purchasedAt: now,
          expiresAt: null,
          sourcePaymentId: null,
          metadata: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          uses: [{ creditsUsed: 5 }], // all 5 credits used
        },
      ];

      // Mock the query builder chain
      const mockQueryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi
          .fn()
          .mockResolvedValue(mockPackages as unknown as StudentPackage[]),
      };

      vi.spyOn(packageRepo, "createQueryBuilder").mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<StudentPackage>,
      );

      const result = await service.getActivePackagesForStudent(1);

      expect(result.packages).toHaveLength(0);
      expect(result.totalRemaining).toBe(0);
    });
  });

  describe("usePackageForSession", () => {
    it("should successfully use package for session with happy path", async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 86400000);

      const mockPackage = {
        id: 1,
        studentId: 1,
        packageName: "5-class pack",
        totalSessions: 5,
        remainingSessions: 2,
        purchasedAt: now,
        expiresAt: futureDate,
        sourcePaymentId: null,
        metadata: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      const mockLockedPackage = { ...mockPackage, remainingSessions: 1 };

      const mockPackageUse = {
        id: 1,
        studentPackageId: 1,
        bookingId: null,
        sessionId: 123,
        usedAt: now,
        usedBy: 1,
        note: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

      // Mock the query builder chain for the first call (with lock)
      const mockQueryBuilderWithLock = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        setLock: vi.fn().mockReturnThis(),
        getOne: vi
          .fn()
          .mockResolvedValue(mockPackage as unknown as StudentPackage),
      };

      // Mock the query builder chain for the second call (without lock)
      const mockQueryBuilderWithoutLock = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getOne: vi
          .fn()
          .mockResolvedValue(mockLockedPackage as unknown as StudentPackage),
      };

      // Mock createQueryBuilder to return different builders based on context
      mockPackageRepo.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilderWithLock)
        .mockReturnValueOnce(mockQueryBuilderWithoutLock);

      // Mock useRepo methods
      mockUseRepo.create.mockReturnValue(
        mockPackageUse as unknown as PackageUse,
      );
      mockUseRepo.save.mockResolvedValue(
        mockPackageUse as unknown as PackageUse,
      );

      const result = await service.usePackageForSession(1, 1, 123, {
        creditsUsed: 1,
      });

      expect(result.use).toBeDefined();
      expect(mockQueryBuilderWithLock.setLock).toHaveBeenCalledWith(
        "pessimistic_write",
      );
    });

    it("should throw NotFoundException when package not found", async () => {
      vi.spyOn(
        PackageQueryBuilder,
        "buildStudentPackageWithUsesQuery",
      ).mockReturnValue({
        setLock: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      } as unknown as SelectQueryBuilder<StudentPackage>);

      await expect(
        service.usePackageForSession(1, 999, 123, { creditsUsed: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when no remaining sessions", async () => {
      const mockPackage = {
        id: 1,
        studentId: 1,
        packageName: "5-class pack",
        totalSessions: 5,
        remainingSessions: 0, // no sessions left
        purchasedAt: new Date(),
        expiresAt: null,
        sourcePaymentId: null,
        metadata: null,
        uses: [
          { creditsUsed: 1 },
          { creditsUsed: 1 },
          { creditsUsed: 1 },
          { creditsUsed: 1 },
          { creditsUsed: 1 },
        ], // 5 uses, so remaining = 0
      };

      vi.spyOn(
        PackageQueryBuilder,
        "buildStudentPackageWithUsesQuery",
      ).mockReturnValue({
        setLock: vi.fn().mockReturnThis(),
        getOne: vi
          .fn()
          .mockResolvedValue(mockPackage as unknown as StudentPackage),
      } as unknown as SelectQueryBuilder<StudentPackage>);

      await expect(
        service.usePackageForSession(1, 1, 123, { creditsUsed: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when package is expired", async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000); // -1 day

      const mockPackage = {
        id: 1,
        studentId: 1,
        packageName: "Expired pack",
        totalSessions: 5,
        remainingSessions: 3,
        purchasedAt: pastDate,
        expiresAt: pastDate, // expired
        sourcePaymentId: null,
        metadata: null,
        uses: [],
      };

      vi.spyOn(
        PackageQueryBuilder,
        "buildStudentPackageWithUsesQuery",
      ).mockReturnValue({
        setLock: vi.fn().mockReturnThis(),
        getOne: vi
          .fn()
          .mockResolvedValue(mockPackage as unknown as StudentPackage),
      } as unknown as SelectQueryBuilder<StudentPackage>);

      await expect(
        service.usePackageForSession(1, 1, 123, { creditsUsed: 1 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("linkUseToBooking", () => {
    it("should successfully link use to booking", async () => {
      const mockUse = {
        id: 1,
        studentPackageId: 1,
        bookingId: null,
        sessionId: 123,
        usedAt: new Date(),
        usedBy: 1,
        note: null,
      };

      const mockUpdatedUse = { ...mockUse, bookingId: 456 };

      vi.spyOn(useRepo, "findOne").mockResolvedValue(
        mockUse as unknown as PackageUse,
      );
      vi.spyOn(useRepo, "save").mockResolvedValue(
        mockUpdatedUse as unknown as PackageUse,
      );

      const result = await service.linkUseToBooking(1, 456);

      expect(result?.bookingId).toBe(456);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(useRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ bookingId: 456 }),
      );
    });

    it("should return null when use not found", async () => {
      vi.spyOn(useRepo, "findOne").mockResolvedValue(null);

      const result = await service.linkUseToBooking(999, 456);

      expect(result).toBeNull();
    });
  });
});
