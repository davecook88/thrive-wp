import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockInstance,
} from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { GroupClassesService } from "./group-classes.service.js";
import { getRepositoryToken } from "@nestjs/typeorm";
import { GroupClass } from "./entities/group-class.entity.js";
import { GroupClassLevel } from "./entities/group-class-level.entity.js";
import { GroupClassTeacher } from "./entities/group-class-teacher.entity.js";
import { Session, SessionStatus } from "../sessions/entities/session.entity.js";
import { ServiceType } from "../common/types/class-types.js";

type MockQueryBuilder = {
  leftJoinAndSelect: MockInstance<() => MockQueryBuilder>;
  loadRelationCountAndMap: MockInstance<() => MockQueryBuilder>;
  where: MockInstance<() => MockQueryBuilder>;
  andWhere: MockInstance<() => MockQueryBuilder>;
  getMany: MockInstance<() => Promise<Session[]>>;
};

describe("GroupClassesService", () => {
  let service: GroupClassesService;

  const mockQueryBuilder: MockQueryBuilder = {
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    loadRelationCountAndMap: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getMany: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupClassesService,
        {
          provide: getRepositoryToken(GroupClass),
          useValue: {
            findOne: vi.fn(),
            find: vi.fn(),
          },
        },
        {
          provide: getRepositoryToken(GroupClassLevel),
          useValue: {
            findOne: vi.fn(),
            find: vi.fn(),
          },
        },
        {
          provide: getRepositoryToken(GroupClassTeacher),
          useValue: {
            findOne: vi.fn(),
            find: vi.fn(),
          },
        },
        {
          provide: getRepositoryToken(Session),
          useValue: {
            save: vi.fn(),
            createQueryBuilder: vi.fn(() => mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<GroupClassesService>(GroupClassesService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getAvailableSessions", () => {
    it("should return sessions with enrollment count and computed fields", async () => {
      // Mock session data with enrolledCount added by loadRelationCountAndMap
      const mockSessions = [
        {
          id: 1,
          type: ServiceType.GROUP,
          startAt: new Date("2025-01-15T14:00:00Z"),
          endAt: new Date("2025-01-15T15:00:00Z"),
          capacityMax: 6,
          status: SessionStatus.SCHEDULED,
          groupClassId: 1,
          teacherId: 1,
          enrolledCount: 4, // Dynamically added by TypeORM
          groupClass: {
            id: 1,
            title: "Spanish B1",
            isActive: true,
            levelId: 3,
            level: { id: 3, code: "B1", name: "Intermediate B1" },
          },
          teacher: {
            id: 1,
            userId: 1,
            bio: "",
            toPublicDto: function () {
              return this;
            },
          },
        },
        {
          id: 2,
          type: ServiceType.GROUP,
          startAt: new Date("2025-01-16T14:00:00Z"),
          endAt: new Date("2025-01-16T15:00:00Z"),
          capacityMax: 6,
          status: SessionStatus.SCHEDULED,
          groupClassId: 1,
          teacherId: 1,
          enrolledCount: 6, // Full session
          groupClass: {
            id: 1,
            title: "Spanish B1",
            isActive: true,
            levelId: 3,
            level: { id: 3, code: "B1", name: "Intermediate B1" },
          },
          teacher: {
            id: 1,
            name: "Teacher One",
            toPublicDto: function () {
              return this;
            },
          },
        },
      ] as unknown as Session[];

      // Setup mock query builder chain
      mockQueryBuilder.getMany.mockResolvedValue(mockSessions);

      const result = await service.getAvailableSessions({
        startDate: new Date("2025-01-15T00:00:00Z"),
        endDate: new Date("2025-01-20T00:00:00Z"),
      });

      expect(result).toHaveLength(2);

      // First session - partially filled
      expect(result[0].enrolledCount).toBe(4);
      expect(result[0].availableSpots).toBe(2);
      expect(result[0].isFull).toBe(false);
      expect(result[0].canJoinWaitlist).toBe(false);

      // Second session - full
      expect(result[1].enrolledCount).toBe(6);
      expect(result[1].availableSpots).toBe(0);
      expect(result[1].isFull).toBe(true);
      expect(result[1].canJoinWaitlist).toBe(true);
    });

    it("should apply level filter correctly", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.getAvailableSessions({ levelIds: [3] });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "level.id IN (:...levelIds)",
        { levelIds: [3] },
      );
    });

    it("should apply teacher filter correctly", async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.getAvailableSessions({ teacherId: 1 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "session.teacherId = :teacherId",
        { teacherId: 1 },
      );
    });

    it("should calculate availableSpots as capacityMax - enrolledCount", async () => {
      const mockSession = {
        id: 1,
        capacityMax: 10,
        enrolledCount: 3,
        type: ServiceType.GROUP,
        status: SessionStatus.SCHEDULED,
        startAt: new Date(),
        endAt: new Date(),
        groupClassId: 1,
        teacherId: 1,
        groupClass: { isActive: true },
        teacher: {
          id: 1,
          name: "Teacher One",
          toPublicDto: function () {
            return this;
          },
        },
      } as unknown as Session;

      mockQueryBuilder.getMany.mockResolvedValue([mockSession]);

      const result = await service.getAvailableSessions({});

      expect(result[0].availableSpots).toBe(7);
    });
  });
});
