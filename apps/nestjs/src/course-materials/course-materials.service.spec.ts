import { describe, vi, it, expect, beforeEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { CourseMaterialsService } from "./course-materials.service.js";
import { CourseStepMaterial } from "./entities/course-step-material.entity.js";
import { MaterialQuestion } from "./entities/material-question.entity.js";
import { StudentAnswer } from "./entities/student-answer.entity.js";
import { StudentCourseStepMaterialProgress } from "./entities/student-course-step-material-progress.entity.js";
import { CourseStep } from "../course-programs/entities/course-step.entity.js";
import { NotFoundException, BadRequestException } from "@nestjs/common";

describe("CourseMaterialsService", () => {
  let service: CourseMaterialsService;
  let materialRepo: Repository<CourseStepMaterial>;
  let questionRepo: Repository<MaterialQuestion>;
  let answerRepo: Repository<StudentAnswer>;
  let progressRepo: Repository<StudentCourseStepMaterialProgress>;
  let courseStepRepo: Repository<CourseStep>;
  let dataSource: DataSource;

  const mockMaterialRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    delete: vi.fn(),
  };

  const mockQuestionRepo = {
    findOne: vi.fn(),
  };

  const mockAnswerRepo = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    createQueryBuilder: vi.fn(),
  };

  const mockProgressRepo = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    createQueryBuilder: vi.fn(),
  };

  const mockCourseStepRepo = {
    findOne: vi.fn(),
  };

  const mockDataSource = {
    transaction: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseMaterialsService,
        {
          provide: getRepositoryToken(CourseStepMaterial),
          useValue: mockMaterialRepo,
        },
        {
          provide: getRepositoryToken(MaterialQuestion),
          useValue: mockQuestionRepo,
        },
        {
          provide: getRepositoryToken(StudentAnswer),
          useValue: mockAnswerRepo,
        },
        {
          provide: getRepositoryToken(StudentCourseStepMaterialProgress),
          useValue: mockProgressRepo,
        },
        {
          provide: getRepositoryToken(CourseStep),
          useValue: mockCourseStepRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<CourseMaterialsService>(CourseMaterialsService);
    materialRepo = module.get<Repository<CourseStepMaterial>>(
      getRepositoryToken(CourseStepMaterial),
    );
    questionRepo = module.get<Repository<MaterialQuestion>>(
      getRepositoryToken(MaterialQuestion),
    );
    answerRepo = module.get<Repository<StudentAnswer>>(
      getRepositoryToken(StudentAnswer),
    );
    progressRepo = module.get<Repository<StudentCourseStepMaterialProgress>>(
      getRepositoryToken(StudentCourseStepMaterialProgress),
    );
    courseStepRepo = module.get<Repository<CourseStep>>(
      getRepositoryToken(CourseStep),
    );
    dataSource = module.get<DataSource>(DataSource);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a material", async () => {
      const dto = {
        courseStepId: 1,
        title: "Test Material",
        type: "file" as const,
        content: "http://example.com/file.pdf",
        order: 1,
      };
      const userId = 1;

      mockCourseStepRepo.findOne.mockResolvedValue({ id: 1 });
      mockDataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          create: vi.fn().mockReturnValue({ id: 1, ...dto }),
          save: vi.fn().mockResolvedValue({ id: 1, ...dto }),
          getRepository: vi.fn().mockReturnValue({
            findOne: vi.fn().mockResolvedValue({ id: 1, ...dto }),
          }),
        };
        return cb(manager);
      });

      const result = await service.create(dto, userId);
      expect(result).toBeDefined();
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it("should throw NotFoundException if course step not found", async () => {
      const dto = {
        courseStepId: 999,
        title: "Test Material",
        type: "file" as const,
        order: 1,
      };
      mockCourseStepRepo.findOne.mockResolvedValue(null);

      await expect(service.create(dto, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe("findAll", () => {
    it("should return an array of materials", async () => {
      const materials = [{ id: 1, title: "Test" }];
      mockMaterialRepo.find.mockResolvedValue(materials);

      const result = await service.findAll(1);
      expect(result).toEqual(materials);
      expect(mockMaterialRepo.find).toHaveBeenCalledWith({
        where: { courseStepId: 1 },
        order: { order: "ASC" },
        relations: ["questions"],
      });
    });
  });

  describe("findOne", () => {
    it("should return a material", async () => {
      const material = { id: 1, title: "Test", type: "file" };
      mockMaterialRepo.findOne.mockResolvedValue(material);

      const result = await service.findOne(1);
      expect(result).toEqual(material);
    });

    it("should throw NotFoundException if material not found", async () => {
      mockMaterialRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should remove a material", async () => {
      mockMaterialRepo.delete.mockResolvedValue({ affected: 1 });
      await service.remove(1);
      expect(mockMaterialRepo.delete).toHaveBeenCalledWith(1);
    });

    it("should throw NotFoundException if material not found", async () => {
      mockMaterialRepo.delete.mockResolvedValue({ affected: 0 });
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update a material", async () => {
      const material = {
        id: 1,
        title: "Old Title",
        type: "file",
        courseStepId: 1,
      };
      const updateDto = { title: "New Title" };

      mockMaterialRepo.findOne.mockResolvedValue(material);
      mockDataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          save: vi.fn().mockResolvedValue({ ...material, ...updateDto }),
          delete: vi.fn(),
          getRepository: vi.fn().mockReturnValue({
            findOne: vi.fn().mockResolvedValue({ ...material, ...updateDto }),
          }),
        };
        return cb(manager);
      });

      const result = await service.update(1, updateDto);
      expect(result.title).toBe("New Title");
    });
  });

  describe("updateProgress", () => {
    it("should create new progress record", async () => {
      const materialId = 1;
      const studentId = 100;
      const studentPackageId = 1;

      mockMaterialRepo.findOne.mockResolvedValue({ id: materialId });
      mockProgressRepo.findOne.mockResolvedValue(null);
      mockProgressRepo.create.mockReturnValue({
        studentId,
        courseStepMaterialId: materialId,
        studentPackageId,
        status: "in_progress",
      });
      mockProgressRepo.save.mockResolvedValue({
        id: 1,
        studentId,
        courseStepMaterialId: materialId,
        studentPackageId,
        status: "in_progress",
      });

      const result = await service.updateProgress(
        studentId,
        materialId,
        studentPackageId,
        "in_progress",
      );

      expect(result.status).toBe("in_progress");
      expect(mockProgressRepo.save).toHaveBeenCalled();
    });

    it("should update existing progress record", async () => {
      const materialId = 1;
      const studentId = 100;
      const studentPackageId = 1;
      const existingProgress = {
        id: 1,
        studentId,
        courseStepMaterialId: materialId,
        studentPackageId,
        status: "in_progress" as const,
        completedAt: null,
      };

      mockMaterialRepo.findOne.mockResolvedValue({ id: materialId });
      mockProgressRepo.findOne.mockResolvedValue(existingProgress);
      mockProgressRepo.save.mockResolvedValue({
        ...existingProgress,
        status: "completed",
        completedAt: new Date(),
      });

      const result = await service.updateProgress(
        studentId,
        materialId,
        studentPackageId,
        "completed",
      );

      expect(result.status).toBe("completed");
      expect(result.completedAt).toBeTruthy();
    });

    it("should throw NotFoundException if material not found", async () => {
      mockMaterialRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateProgress(100, 999, 1, "in_progress"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getProgress", () => {
    it("should return progress for a student and course step", async () => {
      const mockProgress = [
        { id: 1, studentId: 100, courseStepMaterialId: 1, status: "completed" },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(mockProgress),
      };

      mockProgressRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getProgress(100, 1);

      expect(result).toEqual(mockProgress);
      expect(mockProgressRepo.createQueryBuilder).toHaveBeenCalledWith(
        "progress",
      );
    });
  });

  describe("submitAnswer", () => {
    it("should submit a new answer", async () => {
      const questionId = 1;
      const studentId = 100;
      const answerContent = "My answer";

      const mockQuestion = {
        id: questionId,
        questionType: "long_text",
        courseStepMaterial: { id: 1 },
      };

      mockQuestionRepo.findOne.mockResolvedValue(mockQuestion);
      mockAnswerRepo.findOne.mockResolvedValue(null);
      mockAnswerRepo.create.mockReturnValue({
        questionId,
        studentId,
        answerContent,
        status: "pending_assessment",
      });
      mockAnswerRepo.save.mockResolvedValue({
        id: 1,
        questionId,
        studentId,
        answerContent,
        status: "pending_assessment",
      });

      const result = await service.submitAnswer(
        questionId,
        studentId,
        answerContent,
      );

      expect(result.answerContent).toBe(answerContent);
      expect(result.status).toBe("pending_assessment");
    });

    it("should auto-assess multiple choice answers", async () => {
      const questionId = 1;
      const studentId = 100;
      const answerContent = "a";

      const mockQuestion = {
        id: questionId,
        questionType: "multiple_choice",
        options: { a: { text: "Correct", correct: true }, b: { text: "Wrong" } },
        courseStepMaterial: { id: 1 },
      };

      mockQuestionRepo.findOne.mockResolvedValue(mockQuestion);
      mockAnswerRepo.findOne.mockResolvedValue(null);
      mockAnswerRepo.create.mockReturnValue({
        questionId,
        studentId,
        answerContent,
        status: "approved",
      });
      mockAnswerRepo.save.mockResolvedValue({
        id: 1,
        questionId,
        studentId,
        answerContent,
        status: "approved",
      });

      const result = await service.submitAnswer(
        questionId,
        studentId,
        answerContent,
      );

      expect(result.status).toBe("approved");
    });

    it("should throw NotFoundException if question not found", async () => {
      mockQuestionRepo.findOne.mockResolvedValue(null);

      await expect(service.submitAnswer(999, 100, "answer")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getStudentAnswers", () => {
    it("should return all answers for a student", async () => {
      const mockAnswers = [
        { id: 1, studentId: 100, answerContent: "Answer 1" },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(mockAnswers),
      };

      mockAnswerRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getStudentAnswers(100);

      expect(result).toEqual(mockAnswers);
    });
  });

  describe("getAssessmentQueue", () => {
    it("should return pending answers", async () => {
      const mockAnswers = [
        { id: 1, status: "pending_assessment", answerContent: "Answer 1" },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(mockAnswers),
      };

      mockAnswerRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getAssessmentQueue();

      expect(result).toEqual(mockAnswers);
    });
  });

  describe("assessAnswer", () => {
    it("should assess an answer", async () => {
      const answerId = 1;
      const mockAnswer = {
        id: answerId,
        status: "pending_assessment",
        feedback: null,
        assessedById: null,
      };

      mockAnswerRepo.findOne.mockResolvedValue(mockAnswer);
      mockAnswerRepo.save.mockResolvedValue({
        ...mockAnswer,
        status: "approved",
        feedback: "Great work!",
        assessedById: 600,
      });

      const result = await service.assessAnswer(
        answerId,
        "approved",
        "Great work!",
        600,
      );

      expect(result.status).toBe("approved");
      expect(result.feedback).toBe("Great work!");
      expect(result.assessedById).toBe(600);
    });

    it("should throw NotFoundException if answer not found", async () => {
      mockAnswerRepo.findOne.mockResolvedValue(null);

      await expect(
        service.assessAnswer(999, "approved", "feedback", 600),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
