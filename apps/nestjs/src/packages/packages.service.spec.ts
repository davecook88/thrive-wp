import { describe, it, expect, beforeEach, vi } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, EntityManager, DataSource } from "typeorm";
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

describe("PackagesService", () => {
  let service: PackagesService;
  let packageRepo: Repository<StudentPackage>;
  let useRepo: Repository<PackageUse>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackagesService,
        {
          provide: getRepositoryToken(StripeProductMap),
          useClass: Repository,
        },
        {
          provide: ConfigService,
          useValue: { get: () => "sss_test_dummy" },
        },
        {
          provide: getRepositoryToken(StudentPackage),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(PackageAllowance),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Student),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(PackageUse),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Session),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Booking),
          useClass: Repository,
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
        },
      ];

      vi.spyOn(packageRepo, "find").mockResolvedValue(
        mockPackages as unknown as StudentPackage[],
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
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000); // -1 day

      const mockPackages = [
        {
          id: 1,
          studentId: 1,
          packageName: "Expired pack",
          totalSessions: 5,
          remainingSessions: 3,
          purchasedAt: pastDate,
          expiresAt: pastDate, // expired
          sourcePaymentId: null,
          metadata: null,
          createdAt: pastDate,
          updatedAt: pastDate,
          deletedAt: null,
        },
      ];

      vi.spyOn(packageRepo, "find").mockResolvedValue(
        mockPackages as unknown as StudentPackage[],
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
        },
      ];

      vi.spyOn(packageRepo, "find").mockResolvedValue(
        mockPackages as unknown as StudentPackage[],
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

      // Mock initial findOne
      vi.spyOn(packageRepo, "findOne").mockResolvedValue(
        mockPackage as unknown as StudentPackage,
      );

      // Mock transaction manager
      const mockTx = {
        findOne: vi
          .fn()
          .mockResolvedValue(mockPackage as unknown as StudentPackage),
        save: vi
          .fn()
          .mockResolvedValue(mockLockedPackage as unknown as StudentPackage),
        create: vi
          .fn()
          .mockReturnValue(mockPackageUse as unknown as PackageUse),
      } as unknown as EntityManager;

      const mockManager = {
        transaction: vi
          .fn()
          .mockImplementation((callback: (x: unknown) => Promise<void>) => {
            return callback(mockTx);
          }),
      };

      Object.defineProperty(packageRepo, "manager", {
        value: mockManager,
        writable: true,
      });

      const result = await service.usePackageForSession(1, 1, 123, {
        creditsUsed: 1,
      });

      expect(result.use).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockTx.findOne).toHaveBeenCalledWith(StudentPackage, {
        where: { id: 1 },
        lock: { mode: "pessimistic_write" },
      });
    });

    it("should throw NotFoundException when package not found", async () => {
      vi.spyOn(packageRepo, "findOne").mockResolvedValue(null);

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
      };

      vi.spyOn(packageRepo, "findOne").mockResolvedValue(
        mockPackage as unknown as StudentPackage,
      );

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
      };

      vi.spyOn(packageRepo, "findOne").mockResolvedValue(
        mockPackage as unknown as StudentPackage,
      );

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
