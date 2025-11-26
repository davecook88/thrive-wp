import { describe, beforeEach, it, expect, vi } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import { TestimonialsService } from "./testimonials.service.js";
import { Testimonial } from "./entities/testimonial.entity.js";
import { Student } from "../students/entities/student.entity.js";
import { Teacher } from "../teachers/entities/teacher.entity.js";
import { CourseProgram } from "../course-programs/entities/course-program.entity.js";
import { StudentPackage } from "../packages/entities/student-package.entity.js";
import { Booking } from "../payments/entities/booking.entity.js";

describe("TestimonialsService", () => {
  let service: TestimonialsService;
  let testimonialRepo: Repository<Testimonial>;
  let studentRepo: Repository<Student>;
  let teacherRepo: Repository<Teacher>;
  let courseProgramRepo: Repository<CourseProgram>;
  let studentPackageRepo: Repository<StudentPackage>;
  let bookingRepo: Repository<Booking>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestimonialsService,
        {
          provide: getRepositoryToken(Testimonial),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Student),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Teacher),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(CourseProgram),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(StudentPackage),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Booking),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<TestimonialsService>(TestimonialsService);
    testimonialRepo = module.get<Repository<Testimonial>>(
      getRepositoryToken(Testimonial),
    );
    studentRepo = module.get<Repository<Student>>(getRepositoryToken(Student));
    teacherRepo = module.get<Repository<Teacher>>(getRepositoryToken(Teacher));
    courseProgramRepo = module.get<Repository<CourseProgram>>(
      getRepositoryToken(CourseProgram),
    );
    studentPackageRepo = module.get<Repository<StudentPackage>>(
      getRepositoryToken(StudentPackage),
    );
    bookingRepo = module.get<Repository<Booking>>(getRepositoryToken(Booking));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a testimonial with pending status", async () => {
      const studentId = 1;
      const dto = {
        teacherId: 1,
        rating: 5,
        comment: "Great teacher!",
        tags: ["helpful", "patient"],
      };

      const mockStudent = {
        id: studentId,
        user: { id: 1, firstName: "John", lastName: "Doe" },
      };

      const mockTeacher = { id: 1 };
      const mockBooking = { id: 1, studentId, session: { teacherId: 1 } };

      vi.spyOn(studentRepo, "findOne").mockResolvedValue(mockStudent as any);
      vi.spyOn(teacherRepo, "findOne").mockResolvedValue(mockTeacher as any);
      vi.spyOn(bookingRepo, "createQueryBuilder").mockReturnValue({
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(1),
      } as any);

      vi.spyOn(testimonialRepo, "findOne").mockResolvedValue(null);

      const mockTestimonial = {
        id: 1,
        studentId,
        teacherId: dto.teacherId,
        rating: dto.rating,
        comment: dto.comment,
        tags: dto.tags,
        status: "pending",
        isFeatured: false,
      };

      vi.spyOn(testimonialRepo, "create").mockReturnValue(
        mockTestimonial as any,
      );
      vi.spyOn(testimonialRepo, "save").mockResolvedValue(
        mockTestimonial as any,
      );

      const result = await service.create(studentId, dto);

      expect(result.status).toBe("pending");
      expect(result.rating).toBe(5);
      expect(testimonialRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId,
          teacherId: dto.teacherId,
          rating: dto.rating,
          status: "pending",
        }),
      );
    });

    it("should throw NotFoundException if student not found", async () => {
      vi.spyOn(studentRepo, "findOne").mockResolvedValue(null);

      await expect(
        service.create(999, {
          rating: 5,
          comment: "Test",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException if testimonial already exists", async () => {
      const studentId = 1;
      const dto = { teacherId: 1, rating: 5 };

      const mockStudent = {
        id: studentId,
        user: { firstName: "John", lastName: "Doe" },
      };
      const mockTeacher = { id: 1 };
      const existingTestimonial = { id: 1, studentId, teacherId: 1 };

      vi.spyOn(studentRepo, "findOne").mockResolvedValue(mockStudent as any);
      vi.spyOn(teacherRepo, "findOne").mockResolvedValue(mockTeacher as any);
      vi.spyOn(bookingRepo, "createQueryBuilder").mockReturnValue({
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(1),
      } as any);

      vi.spyOn(testimonialRepo, "findOne").mockResolvedValue(
        existingTestimonial as any,
      );

      await expect(service.create(studentId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should throw ForbiddenException if student has not attended sessions with teacher", async () => {
      const studentId = 1;
      const dto = { teacherId: 1, rating: 5 };

      const mockStudent = {
        id: studentId,
        user: { firstName: "John", lastName: "Doe" },
      };
      const mockTeacher = { id: 1 };

      vi.spyOn(studentRepo, "findOne").mockResolvedValue(mockStudent as any);
      vi.spyOn(teacherRepo, "findOne").mockResolvedValue(mockTeacher as any);
      vi.spyOn(bookingRepo, "createQueryBuilder").mockReturnValue({
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(0), // No sessions
      } as any);

      await expect(service.create(studentId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("approve", () => {
    it("should approve a testimonial and set review metadata", async () => {
      const testimonialId = 1;
      const adminId = 1;
      const feedback = "Looks good!";

      const mockTestimonial = {
        id: testimonialId,
        status: "pending",
        reviewedAt: null,
        reviewedByAdminId: null,
        adminFeedback: null,
      };

      vi.spyOn(testimonialRepo, "findOne").mockResolvedValue(
        mockTestimonial as any,
      );
      vi.spyOn(testimonialRepo, "save").mockResolvedValue({
        ...mockTestimonial,
        status: "approved",
        reviewedAt: expect.any(Date),
        reviewedByAdminId: adminId,
        adminFeedback: feedback,
      } as any);

      await service.approve(testimonialId, adminId, { adminFeedback: feedback });

      expect(testimonialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "approved",
          reviewedByAdminId: adminId,
          adminFeedback: feedback,
        }),
      );
    });

    it("should throw NotFoundException if testimonial does not exist", async () => {
      vi.spyOn(testimonialRepo, "findOne").mockResolvedValue(null);

      await expect(service.approve(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("reject", () => {
    it("should reject a testimonial with required feedback", async () => {
      const testimonialId = 1;
      const adminId = 1;
      const feedback = "Inappropriate content";

      const mockTestimonial = {
        id: testimonialId,
        status: "pending",
      };

      vi.spyOn(testimonialRepo, "findOne").mockResolvedValue(
        mockTestimonial as any,
      );
      vi.spyOn(testimonialRepo, "save").mockResolvedValue({
        ...mockTestimonial,
        status: "rejected",
        adminFeedback: feedback,
      } as any);

      await service.reject(testimonialId, adminId, { adminFeedback: feedback });

      expect(testimonialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "rejected",
          adminFeedback: feedback,
        }),
      );
    });
  });

  describe("toggleFeatured", () => {
    it("should toggle isFeatured from false to true", async () => {
      const testimonialId = 1;
      const mockTestimonial = {
        id: testimonialId,
        isFeatured: false,
      };

      vi.spyOn(testimonialRepo, "findOne").mockResolvedValue(
        mockTestimonial as any,
      );
      vi.spyOn(testimonialRepo, "save").mockResolvedValue({
        ...mockTestimonial,
        isFeatured: true,
      } as any);

      await service.toggleFeatured(testimonialId);

      expect(testimonialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isFeatured: true,
        }),
      );
    });
  });

  describe("findAllPublic", () => {
    it("should return only approved testimonials", async () => {
      const mockTestimonials = [
        {
          id: 1,
          status: "approved",
          rating: 5,
          student: { user: { firstName: "John", lastName: "Doe" } },
          createdAt: new Date("2025-01-01"),
        },
        {
          id: 2,
          status: "approved",
          rating: 4,
          student: { user: { firstName: "Jane", lastName: "Smith" } },
          createdAt: new Date("2025-01-02"),
        },
      ];

      vi.spyOn(testimonialRepo, "createQueryBuilder").mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(mockTestimonials),
      } as any);

      const result = await service.findAllPublic();

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("approved");
    });

    it("should filter by minRating", async () => {
      const mockTestimonials = [
        {
          id: 1,
          status: "approved",
          rating: 5,
          student: { user: { firstName: "John", lastName: "Doe" } },
          createdAt: new Date("2025-01-01"),
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(mockTestimonials),
      };

      vi.spyOn(testimonialRepo, "createQueryBuilder").mockReturnValue(
        queryBuilder as any,
      );

      await service.findAllPublic({ minRating: 4 });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "t.rating >= :minRating",
        { minRating: 4 },
      );
    });
  });

  describe("delete", () => {
    it("should soft delete a testimonial", async () => {
      const testimonialId = 1;
      const mockTestimonial = { id: testimonialId };

      vi.spyOn(testimonialRepo, "findOne").mockResolvedValue(
        mockTestimonial as any,
      );
      vi.spyOn(testimonialRepo, "softRemove").mockResolvedValue(
        mockTestimonial as any,
      );

      await service.delete(testimonialId);

      expect(testimonialRepo.softRemove).toHaveBeenCalledWith(mockTestimonial);
    });

    it("should throw NotFoundException if testimonial does not exist", async () => {
      vi.spyOn(testimonialRepo, "findOne").mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });
});
