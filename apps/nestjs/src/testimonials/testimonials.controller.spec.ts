import { describe, beforeEach, it, expect, vi } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext } from "@nestjs/common";
import {
  TestimonialsController,
  StudentTestimonialsController,
  AdminTestimonialsController,
} from "./testimonials.controller.js";
import { TestimonialsService } from "./testimonials.service.js";
import { UsersService } from "../users/users.service.js";
import { StudentGuard } from "../auth/student.guard.js";
import { AdminGuard } from "../auth/admin.guard.js";
import type { RequestWithUser } from "../auth/types.js";

describe("TestimonialsController", () => {
  let controller: TestimonialsController;
  let service: TestimonialsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestimonialsController],
      providers: [
        {
          provide: TestimonialsService,
          useValue: {
            findAllPublic: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TestimonialsController>(TestimonialsController);
    service = module.get<TestimonialsService>(TestimonialsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getPublicTestimonials", () => {
    it("should return filtered testimonials", async () => {
      const mockTestimonials = [
        {
          id: 1,
          studentId: 1,
          studentName: "John Doe",
          teacherId: 1,
          teacherName: "Jane Teacher",
          rating: 5,
          comment: "Great teacher!",
          status: "approved",
          isFeatured: false,
          createdAt: "2025-01-01T00:00:00Z",
        },
      ];

      vi.spyOn(service, "findAllPublic").mockResolvedValue(
        mockTestimonials as any,
      );

      // Note: parameter order is teacherId, courseProgramId, limit, minRating, isFeatured
      const result = await controller.getPublicTestimonials(
        "1",      // teacherId
        undefined, // courseProgramId
        "10",     // limit
        "5",      // minRating
        "true",   // isFeatured
      );

      expect(result).toEqual(mockTestimonials);
      expect(service.findAllPublic).toHaveBeenCalledWith({
        teacherId: 1,
        courseProgramId: undefined,
        minRating: 5,
        featuredOnly: true,
        limit: 10,
      });
    });

    it("should handle optional query parameters", async () => {
      vi.spyOn(service, "findAllPublic").mockResolvedValue([]);

      await controller.getPublicTestimonials();

      expect(service.findAllPublic).toHaveBeenCalledWith({});
    });
  });
});

describe("StudentTestimonialsController", () => {
  let controller: StudentTestimonialsController;
  let service: TestimonialsService;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentTestimonialsController],
      providers: [
        {
          provide: TestimonialsService,
          useValue: {
            create: vi.fn(),
            checkEligibility: vi.fn(),
            findByStudent: vi.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: vi.fn(),
          },
        },
      ],
    })
      .overrideGuard(StudentGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = req.user || { id: 1, email: "student@example.com", roles: ["student"] };
          return true;
        },
      })
      .compile();

    controller = module.get<StudentTestimonialsController>(
      StudentTestimonialsController,
    );
    service = module.get<TestimonialsService>(TestimonialsService);
    usersService = module.get<UsersService>(UsersService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("submitTestimonial", () => {
    it("should create a testimonial", async () => {
      const mockUser = {
        id: 1,
        student: { id: 10 },
      };

      const dto = {
        teacherId: 1,
        rating: 5,
        comment: "Great teacher!",
      };

      const mockTestimonial = {
        id: 1,
        studentId: 10,
        studentName: "John Doe",
        teacherId: 1,
        teacherName: "Jane Teacher",
        rating: 5,
        comment: "Great teacher!",
        status: "pending",
        isFeatured: false,
        createdAt: "2025-01-01T00:00:00Z",
      };

      vi.spyOn(usersService, "findById").mockResolvedValue(mockUser as any);
      vi.spyOn(service, "create").mockResolvedValue({ id: 1 } as any);
      vi.spyOn(service, "findByStudent").mockResolvedValue([mockTestimonial] as any);

      const req = { user: { id: 1 } } as RequestWithUser;

      const result = await controller.submitTestimonial(req, dto);

      expect(result).toEqual(mockTestimonial);
      expect(usersService.findById).toHaveBeenCalledWith(1);
      expect(service.create).toHaveBeenCalledWith(10, dto);
      expect(service.findByStudent).toHaveBeenCalledWith(10);
    });
  });

  describe("checkEligibility", () => {
    it("should return eligibility information", async () => {
      const mockUser = {
        id: 1,
        student: { id: 10 },
      };

      const mockEligibility = {
        eligibleTeachers: [
          { teacherId: 1, teacherName: "Jane Teacher", sessionCount: 5 },
        ],
        eligibleCourses: [
          { courseProgramId: 2, courseProgramTitle: "Math 101" },
        ],
        canSubmitGeneral: true,
      };

      vi.spyOn(usersService, "findById").mockResolvedValue(mockUser as any);
      vi.spyOn(service, "checkEligibility").mockResolvedValue(
        mockEligibility as any,
      );

      const req = { user: { id: 1 } } as RequestWithUser;

      const result = await controller.checkEligibility(req);

      expect(result).toEqual(mockEligibility);
      expect(service.checkEligibility).toHaveBeenCalledWith(10);
    });
  });

  describe("getMyTestimonials", () => {
    it("should return student's testimonials", async () => {
      const mockUser = {
        id: 1,
        student: { id: 10 },
      };

      const mockTestimonials = [
        {
          id: 1,
          studentId: 10,
          rating: 5,
          status: "approved",
        },
      ];

      vi.spyOn(usersService, "findById").mockResolvedValue(mockUser as any);
      vi.spyOn(service, "findByStudent").mockResolvedValue(
        mockTestimonials as any,
      );

      const req = { user: { id: 1 } } as RequestWithUser;

      const result = await controller.getMyTestimonials(req);

      expect(result).toEqual(mockTestimonials);
      expect(service.findByStudent).toHaveBeenCalledWith(10);
    });
  });
});

describe("AdminTestimonialsController", () => {
  let controller: AdminTestimonialsController;
  let service: TestimonialsService;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminTestimonialsController],
      providers: [
        {
          provide: TestimonialsService,
          useValue: {
            findAllForAdmin: vi.fn(),
            approve: vi.fn(),
            reject: vi.fn(),
            toggleFeatured: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: vi.fn(),
          },
        },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = req.user || { id: 1, email: "admin@example.com", roles: ["admin"] };
          return true;
        },
      })
      .compile();

    controller = module.get<AdminTestimonialsController>(
      AdminTestimonialsController,
    );
    service = module.get<TestimonialsService>(TestimonialsService);
    usersService = module.get<UsersService>(UsersService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getAllTestimonials", () => {
    it("should return paginated testimonials", async () => {
      const mockResult = {
        testimonials: [
          {
            id: 1,
            studentId: 1,
            rating: 5,
            status: "pending",
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      vi.spyOn(service, "findAllForAdmin").mockResolvedValue(
        mockResult as any,
      );

      // Parameter order: status, teacherId, courseProgramId, page, limit
      const result = await controller.getAllTestimonials("pending", undefined, undefined, "1", "20");

      expect(result).toEqual(mockResult);
      expect(service.findAllForAdmin).toHaveBeenCalledWith({
        status: "pending",
        page: 1,
        limit: 20,
      });
    });

    it("should handle optional filters", async () => {
      vi.spyOn(service, "findAllForAdmin").mockResolvedValue({
        testimonials: [],
        total: 0,
        page: 1,
        limit: 20,
      } as any);

      await controller.getAllTestimonials();

      expect(service.findAllForAdmin).toHaveBeenCalledWith({});
    });
  });

  describe("approveTestimonial", () => {
    it("should approve a testimonial", async () => {
      const mockUser = {
        id: 1,
        admin: { id: 5 },
      };

      const dto = {
        adminFeedback: "Looks good!",
      };

      vi.spyOn(usersService, "findById").mockResolvedValue(mockUser as any);
      vi.spyOn(service, "approve").mockResolvedValue(undefined);

      const req = { user: { id: 1 } } as RequestWithUser;

      const result = await controller.approveTestimonial(req, 1, dto);

      expect(result).toEqual({ message: "Testimonial approved successfully" });
      expect(service.approve).toHaveBeenCalledWith(1, 5, dto);
    });
  });

  describe("rejectTestimonial", () => {
    it("should reject a testimonial", async () => {
      const mockUser = {
        id: 1,
        admin: { id: 5 },
      };

      const dto = {
        adminFeedback: "Inappropriate content",
      };

      vi.spyOn(usersService, "findById").mockResolvedValue(mockUser as any);
      vi.spyOn(service, "reject").mockResolvedValue(undefined);

      const req = { user: { id: 1 } } as RequestWithUser;

      const result = await controller.rejectTestimonial(req, 1, dto);

      expect(result).toEqual({ message: "Testimonial rejected successfully" });
      expect(service.reject).toHaveBeenCalledWith(1, 5, dto);
    });
  });

  describe("toggleFeatured", () => {
    it("should toggle featured status", async () => {
      vi.spyOn(service, "toggleFeatured").mockResolvedValue(undefined);

      const result = await controller.toggleFeatured(1);

      expect(result).toEqual({ message: "Featured status toggled successfully" });
      expect(service.toggleFeatured).toHaveBeenCalledWith(1);
    });
  });

  describe("updateTestimonial", () => {
    it("should update a testimonial", async () => {
      const dto = {
        rating: 4,
        comment: "Updated by admin",
      };

      const mockUpdated = {
        id: 1,
        rating: 4,
        comment: "Updated by admin",
        studentId: 10,
        status: "pending",
      };

      vi.spyOn(service, "update").mockResolvedValue({ id: 1 } as any);
      vi.spyOn(service, "findAllForAdmin").mockResolvedValue({
        testimonials: [mockUpdated],
        total: 1,
        page: 1,
        limit: 1,
      } as any);

      const result = await controller.updateTestimonial(1, dto);

      expect(result).toEqual(mockUpdated);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe("deleteTestimonial", () => {
    it("should delete a testimonial", async () => {
      vi.spyOn(service, "delete").mockResolvedValue(undefined);

      const result = await controller.deleteTestimonial(1);

      expect(result).toEqual({ message: "Testimonial deleted successfully" });
      expect(service.delete).toHaveBeenCalledWith(1);
    });
  });
});
