import { describe, beforeEach, it, expect, vi } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import { UsersService } from "./users.service.js";
import { User } from "./entities/user.entity.js";
import { Admin } from "./entities/admin.entity.js";
import { Teacher } from "../teachers/entities/teacher.entity.js";

// Mock entity types for testing
type MockUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  admin?: MockAdmin | null;
  teacher?: MockTeacher | null;
};

type MockAdmin = {
  id: number;
  userId: number;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};

type MockTeacher = {
  id: number;
  userId: number;
  tier: number;
  bio: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};

// Loosely-typed query builder mock to avoid TS friction
type MockQueryBuilder = {
  leftJoinAndSelect: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  skip: ReturnType<typeof vi.fn>;
  take: ReturnType<typeof vi.fn>;
  andWhere: ReturnType<typeof vi.fn>;
  getManyAndCount: ReturnType<typeof vi.fn>;
};

describe("UsersService", () => {
  let service: UsersService;
  let userRepo: Repository<User>;
  let adminRepo: Repository<Admin>;
  let teacherRepo: Repository<Teacher>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Admin),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Teacher),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    adminRepo = module.get<Repository<Admin>>(getRepositoryToken(Admin));
    teacherRepo = module.get<Repository<Teacher>>(getRepositoryToken(Teacher));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getUsersPaginated", () => {
    it("should return paginated users with admin and teacher joins", async () => {
      const mockUser: MockUser = {
        id: 1,
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        admin: {
          id: 1,
          userId: 1,
          role: "admin",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        teacher: null,
      };

      const mockQueryBuilder: MockQueryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn(
          () => [[mockUser as unknown as User], 1] as [User[], number],
        ),
      };

      vi.spyOn(userRepo, "createQueryBuilder").mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<User>,
      );

      const result = await service.getUsersPaginated({
        page: 1,
        limit: 10,
      });

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.users[0].email).toBe("test@example.com");
      expect(result.users[0].admin?.role).toBe("admin");
    });

    it("should apply search filter", async () => {
      const mockQueryBuilder: MockQueryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn(() => [[], 0] as [User[], number]),
      };

      vi.spyOn(userRepo, "createQueryBuilder").mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<User>,
      );

      await service.getUsersPaginated({
        page: 1,
        limit: 10,
        search: "john",
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "(user.email LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search)",
        { search: "%john%" },
      );
    });

    it("should apply role filter for admin", async () => {
      const mockQueryBuilder: MockQueryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn(() => [[], 0] as [User[], number]),
      };

      vi.spyOn(userRepo, "createQueryBuilder").mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<User>,
      );

      await service.getUsersPaginated({
        page: 1,
        limit: 10,
        role: "admin",
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "admin.id IS NOT NULL AND admin.isActive = 1",
      );
    });
  });

  describe("makeUserAdmin", () => {
    it("should make a user an admin successfully", async () => {
      const mockUser: MockUser = {
        id: 1,
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: undefined,
        admin: null,
        teacher: null,
      };

      const mockUpdatedUser: MockUser = {
        ...mockUser,
        admin: {
          id: 1,
          userId: 1,
          role: "admin",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      vi.spyOn(userRepo, "findOne")
        .mockResolvedValueOnce(mockUser as unknown as User) // First call for validation
        .mockResolvedValueOnce(mockUpdatedUser as unknown as User); // Second call for reload

      const mockAdmin: MockAdmin = {
        id: 1,
        userId: 1,
        role: "admin",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createSpy = vi.spyOn(adminRepo, "create");
      const saveSpy = vi.spyOn(adminRepo, "save");

      createSpy.mockReturnValue(mockAdmin as Admin);
      saveSpy.mockResolvedValue(mockAdmin as Admin);

      const result = await service.makeUserAdmin(1);

      expect(result.email).toBe("test@example.com");
      expect(result.admin?.role).toBe("admin");
      expect(createSpy).toHaveBeenCalledWith({
        userId: 1,
        role: "admin",
        isActive: true,
      });
      expect(saveSpy).toHaveBeenCalled();
    });

    it("should throw NotFoundException if user does not exist", async () => {
      vi.spyOn(userRepo, "findOne").mockResolvedValue(null);

      await expect(service.makeUserAdmin(999)).rejects.toThrow(
        "User not found",
      );
    });

    it("should throw ConflictException if user is already an admin", async () => {
      const mockUser: MockUser = {
        id: 1,
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: undefined,
        admin: {
          id: 1,
          userId: 1,
          role: "admin",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        teacher: null,
      };

      vi.spyOn(userRepo, "findOne").mockResolvedValue(
        mockUser as unknown as User,
      );

      await expect(service.makeUserAdmin(1)).rejects.toThrow(
        "User is already an admin",
      );
    });
  });

  describe("makeUserTeacher", () => {
    it("should make a user a teacher successfully", async () => {
      const mockUser: MockUser = {
        id: 1,
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: undefined,
        admin: null,
        teacher: null,
      };

      const mockUpdatedUser: MockUser = {
        ...mockUser,
        teacher: {
          id: 1,
          userId: 1,
          tier: 10,
          bio: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      vi.spyOn(userRepo, "findOne")
        .mockResolvedValueOnce(mockUser as unknown as User) // First call for validation
        .mockResolvedValueOnce(mockUpdatedUser as unknown as User); // Second call for reload

      const mockTeacher: MockTeacher = {
        id: 1,
        userId: 1,
        tier: 10,
        bio: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createSpy = vi.spyOn(teacherRepo, "create");
      const saveSpy = vi.spyOn(teacherRepo, "save");

      createSpy.mockReturnValue(mockTeacher as Teacher);
      saveSpy.mockResolvedValue(mockTeacher as Teacher);

      const result = await service.makeUserTeacher(1);

      expect(result.email).toBe("test@example.com");
      expect(result.teacher?.tier).toBe(10);
      expect(createSpy).toHaveBeenCalledWith({
        userId: 1,
        tier: 10,
        bio: null,
        isActive: true,
      });
      expect(saveSpy).toHaveBeenCalled();
    });

    it("should throw NotFoundException if user does not exist", async () => {
      vi.spyOn(userRepo, "findOne").mockResolvedValue(null);

      await expect(service.makeUserTeacher(999)).rejects.toThrow(
        "User not found",
      );
    });

    it("should throw ConflictException if user is already a teacher", async () => {
      const mockUser: MockUser = {
        id: 1,
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: undefined,
        admin: null,
        teacher: {
          id: 1,
          userId: 1,
          tier: 10,
          bio: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      vi.spyOn(userRepo, "findOne").mockResolvedValue(
        mockUser as unknown as User,
      );

      await expect(service.makeUserTeacher(1)).rejects.toThrow(
        "User is already a teacher",
      );
    });
  });
});
