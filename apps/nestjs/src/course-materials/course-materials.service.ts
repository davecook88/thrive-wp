import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository, InjectDataSource } from "@nestjs/typeorm";
import { DataSource, Repository, EntityManager } from "typeorm";
import { CourseStep } from "../course-programs/entities/course-step.entity.js";
import { StudentPackage } from "../packages/entities/student-package.entity.js";
import { ScopeType } from "../payments/entities/stripe-product-map.entity.js";
import { CreateCourseStepMaterialDto } from "./dto/create-course-step-material.dto.js";
import { UpdateCourseStepMaterialDto } from "./dto/update-course-step-material.dto.js";
import { CourseStepMaterial } from "./entities/course-step-material.entity.js";
import { MaterialQuestion } from "./entities/material-question.entity.js";
import { StudentAnswer } from "./entities/student-answer.entity.js";
import { StudentCourseStepMaterialProgress } from "./entities/student-course-step-material-progress.entity.js";

@Injectable()
export class CourseMaterialsService {
  constructor(
    @InjectRepository(CourseStepMaterial)
    private readonly materialRepo: Repository<CourseStepMaterial>,
    @InjectRepository(MaterialQuestion)
    private readonly questionRepo: Repository<MaterialQuestion>,
    @InjectRepository(StudentAnswer)
    private readonly answerRepo: Repository<StudentAnswer>,
    @InjectRepository(StudentCourseStepMaterialProgress)
    private readonly progressRepo: Repository<StudentCourseStepMaterialProgress>,
    @InjectRepository(CourseStep)
    private readonly courseStepRepo: Repository<CourseStep>,
    @InjectRepository(StudentPackage)
    private readonly studentPackageRepo: Repository<StudentPackage>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    console.log(
      "CourseMaterialsService initialized. DataSource:",
      !!this.dataSource,
    );
  }

  async create(
    dto: CreateCourseStepMaterialDto,
    userId: number,
  ): Promise<CourseStepMaterial> {
    const courseStep = await this.courseStepRepo.findOne({
      where: { id: dto.courseStepId },
    });

    if (!courseStep) {
      throw new NotFoundException(
        `CourseStep with ID ${dto.courseStepId} not found`,
      );
    }

    if (dto.type === "question" && !dto.question) {
      throw new BadRequestException(
        "Question data is required when type is 'question'",
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { question: _, ...materialData } = dto;
      const material = manager.create(CourseStepMaterial, {
        ...materialData,
        createdById: userId,
      });

      const savedMaterial = await manager.save(material);

      if (dto.type === "question" && dto.question) {
        const question = manager.create(MaterialQuestion, {
          ...dto.question,
          courseStepMaterialId: savedMaterial.id,
        });
        await manager.save(question);
      }

      return this.findOne(savedMaterial.id, manager);
    });
  }

  async findAll(courseStepId: number): Promise<CourseStepMaterial[]> {
    return this.materialRepo.find({
      where: { courseStepId },
      order: { order: "ASC" },
      relations: ["questions"],
    });
  }

  async findOne(
    id: number,
    manager?: EntityManager,
  ): Promise<CourseStepMaterial> {
    const repo = manager
      ? manager.getRepository(CourseStepMaterial)
      : this.materialRepo;
    const material = await repo.findOne({
      where: { id },
      relations: ["courseStep"],
    });

    if (!material) {
      throw new NotFoundException(`CourseStepMaterial with ID ${id} not found`);
    }

    // If it's a question, fetch the question details
    if (material.type === "question") {
      const questionRepo = manager
        ? manager.getRepository(MaterialQuestion)
        : this.questionRepo;
      const question = await questionRepo.findOne({
        where: { courseStepMaterialId: id },
      });
      // @ts-expect-error - attaching question dynamically
      material.question = question;
    }

    return material;
  }

  async update(
    id: number,
    dto: UpdateCourseStepMaterialDto,
  ): Promise<CourseStepMaterial> {
    const material = await this.findOne(id);

    return await this.dataSource.transaction(async (manager) => {
      if (
        dto.type === "question" &&
        !dto.question &&
        material.type !== "question"
      ) {
        // If changing to question, need question data
        throw new BadRequestException(
          "Question data is required when changing type to 'question'",
        );
      }

      // Update material fields
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { question, ...materialFields } = dto;
      Object.assign(material, materialFields);
      await manager.save(material);

      // Handle question update
      if (material.type === "question") {
        const existingQuestion = await this.questionRepo.findOne({
          where: { courseStepMaterialId: id },
        });

        if (dto.question) {
          if (existingQuestion) {
            Object.assign(existingQuestion, dto.question);
            await manager.save(existingQuestion);
          } else {
            const newQuestion = manager.create(MaterialQuestion, {
              ...dto.question,
              courseStepMaterialId: id,
            });
            await manager.save(newQuestion);
          }
        }
      } else {
        // If type changed from question to something else, delete the question?
        // Or keep it orphaned? Better to delete.
        await manager.delete(MaterialQuestion, { courseStepMaterialId: id });
      }

      return this.findOne(id, manager);
    });
  }

  async remove(id: number): Promise<void> {
    const result = await this.materialRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`CourseStepMaterial with ID ${id} not found`);
    }
  }

  // Student Progress Tracking
  async updateProgress(
    studentId: number,
    materialId: number,
    studentPackageId: number,
    status: "not_started" | "in_progress" | "completed",
  ): Promise<StudentCourseStepMaterialProgress> {
    const material = await this.materialRepo.findOne({
      where: { id: materialId },
    });
    if (!material) {
      throw new NotFoundException(`Material with ID ${materialId} not found`);
    }

    let progress = await this.progressRepo.findOne({
      where: { studentId, courseStepMaterialId: materialId },
    });

    if (!progress) {
      progress = this.progressRepo.create({
        studentId,
        courseStepMaterialId: materialId,
        studentPackageId,
        status,
        completedAt: status === "completed" ? new Date() : null,
      });
    } else {
      progress.status = status;
      progress.completedAt = status === "completed" ? new Date() : null;
    }

    return this.progressRepo.save(progress);
  }

  async getProgress(
    studentId: number,
    courseStepId: number,
  ): Promise<StudentCourseStepMaterialProgress[]> {
    return this.progressRepo
      .createQueryBuilder("progress")
      .leftJoinAndSelect("progress.courseStepMaterial", "material")
      .where("progress.studentId = :studentId", { studentId })
      .andWhere("material.courseStepId = :courseStepId", { courseStepId })
      .orderBy("material.order", "ASC")
      .getMany();
  }

  // Student Answer Submission
  async submitAnswer(
    questionId: number,
    studentId: number,
    answerContent: string,
  ): Promise<StudentAnswer> {
    const question = await this.questionRepo.findOne({
      where: { id: questionId },
      relations: ["courseStepMaterial"],
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    // For multiple choice, auto-assess the answer
    let status: "pending_assessment" | "approved" | "needs_revision" =
      "pending_assessment";
    const assessedById: number | null = null;

    if (question.questionType === "multiple_choice") {
      const correctAnswer = this.getCorrectAnswer(question.options);
      if (answerContent === correctAnswer) {
        status = "approved";
      } else {
        status = "needs_revision";
      }
    }

    let answer = await this.answerRepo.findOne({
      where: { questionId, studentId },
    });

    if (answer) {
      answer.answerContent = answerContent;
      answer.status = status;
      answer.assessedById = assessedById;
    } else {
      answer = this.answerRepo.create({
        questionId,
        studentId,
        answerContent,
        status,
        assessedById,
      });
    }

    return this.answerRepo.save(answer);
  }

  async getStudentAnswers(studentId: number): Promise<StudentAnswer[]> {
    return this.answerRepo
      .createQueryBuilder("answer")
      .leftJoinAndSelect("answer.question", "question")
      .leftJoinAndSelect("question.courseStepMaterial", "material")
      .where("answer.studentId = :studentId", { studentId })
      .orderBy("answer.createdAt", "DESC")
      .getMany();
  }

  async getAnswersByQuestion(questionId: number): Promise<StudentAnswer[]> {
    return this.answerRepo
      .createQueryBuilder("answer")
      .leftJoinAndSelect("answer.student", "student")
      .where("answer.questionId = :questionId", { questionId })
      .orderBy("answer.createdAt", "ASC")
      .getMany();
  }

  // Teacher Assessment
  async getAssessmentQueue(): Promise<StudentAnswer[]> {
    return this.answerRepo
      .createQueryBuilder("answer")
      .leftJoinAndSelect("answer.student", "student")
      .leftJoinAndSelect("answer.question", "question")
      .leftJoinAndSelect("question.courseStepMaterial", "material")
      .where("answer.status = :status", { status: "pending_assessment" })
      .orderBy("answer.createdAt", "ASC")
      .getMany();
  }

  async assessAnswer(
    answerId: number,
    status: "approved" | "needs_revision",
    feedback: string,
    assessedById: number,
  ): Promise<StudentAnswer> {
    const answer = await this.answerRepo.findOne({
      where: { id: answerId },
    });

    if (!answer) {
      throw new NotFoundException(`Answer with ID ${answerId} not found`);
    }

    answer.status = status;
    answer.feedback = feedback;
    answer.assessedById = assessedById;

    return this.answerRepo.save(answer);
  }

  /**
   * Get the correct answer from multiple choice options.
   * Assumes the option with key 'correct' or the first option marked as correct.
   */
  private getCorrectAnswer(
    options: Record<string, Record<string, boolean> | string> | null,
  ): string {
    if (!options) return "";

    // Look for an option with a 'correct' flag
    for (const [key, value] of Object.entries(options)) {
      if (
        typeof value === "object" &&
        "correct" in value &&
        value.correct === true
      ) {
        return key;
      }
    }

    // Fallback to first key
    const firstKey = Object.keys(options)[0];
    return firstKey || "";
  }

  async getEnrollmentForStep(
    userId: number,
    courseStepId: number,
  ): Promise<{ studentPackageId: number } | null> {
    const courseStep = await this.courseStepRepo.findOne({
      where: { id: courseStepId },
    });

    if (!courseStep) {
      return null;
    }

    // Find active package for this course
    const studentPackage = await this.studentPackageRepo.findOne({
      where: {
        student: { userId },
        stripeProductMap: {
          scopeType: ScopeType.COURSE,
          scopeId: courseStep.courseProgramId,
        },
      },
      relations: ["stripeProductMap"],
      order: { purchasedAt: "DESC" },
    });

    if (!studentPackage) {
      return null;
    }

    return { studentPackageId: studentPackage.id };
  }
}
