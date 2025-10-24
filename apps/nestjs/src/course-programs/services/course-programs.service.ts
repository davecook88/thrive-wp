import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { CourseProgram } from "../entities/course-program.entity.js";
import { CreateCourseProgramDto, UpdateCourseProgramDto } from "@thrive/shared";

@Injectable()
export class CourseProgramsService {
  constructor(
    @InjectRepository(CourseProgram)
    private readonly courseProgramRepo: Repository<CourseProgram>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new course program
   */
  async create(input: CreateCourseProgramDto): Promise<CourseProgram> {
    // Check for duplicate code
    const existing = await this.courseProgramRepo.findOne({
      where: { code: input.code },
    });

    if (existing) {
      throw new ConflictException(
        `Course program with code "${input.code}" already exists`,
      );
    }

    const courseProgram = this.courseProgramRepo.create(input);
    return this.courseProgramRepo.save(courseProgram);
  }

  /**
   * Update an existing course program
   */
  async update(
    id: number,
    input: UpdateCourseProgramDto,
  ): Promise<CourseProgram> {
    const courseProgram = await this.findOneOrFail(id);

    // Check for duplicate code if changing
    if (input.code && input.code !== courseProgram.code) {
      const existing = await this.courseProgramRepo.findOne({
        where: { code: input.code },
      });

      if (existing) {
        throw new ConflictException(
          `Course program with code "${input.code}" already exists`,
        );
      }
    }

    Object.assign(courseProgram, input);
    return this.courseProgramRepo.save(courseProgram);
  }

  /**
   * Find course program by ID with relations
   */
  async findOne(
    id: number,
    includeRelations = false,
  ): Promise<CourseProgram | null> {
    const queryBuilder = this.courseProgramRepo
      .createQueryBuilder("cp")
      .where("cp.id = :id", { id });

    if (includeRelations) {
      queryBuilder
        .leftJoinAndSelect("cp.steps", "step")
        .leftJoinAndSelect("step.stepOptions", "option")
        .leftJoinAndSelect("option.groupClass", "groupClass")
        .leftJoinAndSelect("cp.bundleComponents", "bundle")
        .orderBy("step.stepOrder", "ASC")
        .addOrderBy("option.id", "ASC");
    }

    return queryBuilder.getOne();
  }

  /**
   * Find or fail (throws NotFoundException)
   */
  async findOneOrFail(
    id: number,
    includeRelations = false,
  ): Promise<CourseProgram> {
    const courseProgram = await this.findOne(id, includeRelations);

    if (!courseProgram) {
      throw new NotFoundException(`Course program with ID ${id} not found`);
    }

    return courseProgram;
  }

  /**
   * Find course program by code
   */
  async findByCode(
    code: string,
    includeRelations = false,
  ): Promise<CourseProgram | null> {
    const queryBuilder = this.courseProgramRepo
      .createQueryBuilder("cp")
      .where("cp.code = :code", { code });

    if (includeRelations) {
      queryBuilder
        .leftJoinAndSelect("cp.steps", "step")
        .leftJoinAndSelect("step.stepOptions", "option")
        .leftJoinAndSelect("option.groupClass", "groupClass")
        .leftJoinAndSelect("cp.bundleComponents", "bundle")
        .orderBy("step.stepOrder", "ASC")
        .addOrderBy("option.id", "ASC");
    }

    return queryBuilder.getOne();
  }

  /**
   * List all active course programs
   */
  async findAll(includeInactive = false): Promise<CourseProgram[]> {
    const queryBuilder = this.courseProgramRepo
      .createQueryBuilder("cp")
      .leftJoinAndSelect("cp.steps", "step")
      .orderBy("cp.createdAt", "DESC")
      .addOrderBy("step.stepOrder", "ASC");

    if (!includeInactive) {
      queryBuilder.where("cp.isActive = :isActive", { isActive: true });
    }

    return queryBuilder.getMany();
  }

  /**
   * Soft delete a course program
   */
  async remove(id: number): Promise<void> {
    const courseProgram = await this.findOneOrFail(id);

    // Check if there are active enrollments
    const enrollmentCount = await this.dataSource
      .createQueryBuilder()
      .select("COUNT(*)", "count")
      .from("student_course_enrollment", "sce")
      .where("sce.course_program_id = :id", { id })
      .andWhere("sce.status = :status", { status: "ACTIVE" })
      .getRawOne();

    if (parseInt(enrollmentCount.count) > 0) {
      throw new BadRequestException(
        "Cannot delete course program with active enrollments. Deactivate it instead.",
      );
    }

    await this.courseProgramRepo.softRemove(courseProgram);
  }

  /**
   * Publish course to Stripe (placeholder - implemented in stripe service)
   */
  async publishToStripe(
    id: number,
    priceInCents: number,
    currency = "usd",
  ): Promise<{ stripeProductId: string; stripePriceId: string }> {
    const courseProgram = await this.findOneOrFail(id, true);

    // Validation: ensure course has at least one step with options
    if (!courseProgram.steps || courseProgram.steps.length === 0) {
      throw new BadRequestException(
        "Course must have at least one step before publishing",
      );
    }

    const stepsWithOptions = courseProgram.steps.filter(
      (step) => step.options && step.options.length > 0,
    );

    if (stepsWithOptions.length === 0) {
      throw new BadRequestException(
        "Course must have at least one step with class options before publishing",
      );
    }

    // TODO: Call stripe service to create product/price
    // For now, return placeholder
    throw new Error(
      "Stripe integration not yet implemented - see course-programs-stripe.md",
    );
  }
}
