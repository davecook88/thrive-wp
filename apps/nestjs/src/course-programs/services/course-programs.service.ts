import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { CourseProgram } from "../entities/course-program.entity.js";
import { CourseProgramLevel } from "../entities/course-program-level.entity.js";
import {
  CreateCourseProgramDto,
  UpdateCourseProgramDto,
  CourseProgramDetailDto,
} from "@thrive/shared";
import { StripeProductService } from "../../common/services/stripe-product.service.js";
import {
  StripeProductMap,
  ScopeType,
} from "../../payments/entities/stripe-product-map.entity.js";

@Injectable()
export class CourseProgramsService {
  constructor(
    @InjectRepository(CourseProgram)
    private readonly courseProgramRepo: Repository<CourseProgram>,
    @InjectRepository(CourseProgramLevel)
    private readonly courseProgramLevelRepo: Repository<CourseProgramLevel>,
    @InjectRepository(StripeProductMap)
    private readonly stripeProductMapRepo: Repository<StripeProductMap>,
    private readonly dataSource: DataSource,
    private readonly stripeProductService: StripeProductService,
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

    // Extract levelIds before creating the entity
    const { levelIds, ...courseProgramData } =
      input as CreateCourseProgramDto & {
        levelIds?: number[];
      };

    const courseProgram = this.courseProgramRepo.create(courseProgramData);
    const savedProgram = await this.courseProgramRepo.save(courseProgram);

    // Create level associations if provided
    if (levelIds && levelIds.length > 0) {
      const levelAssociations = levelIds.map((levelId: number) =>
        this.courseProgramLevelRepo.create({
          courseProgramId: savedProgram.id,
          levelId,
        }),
      );
      await this.courseProgramLevelRepo.save(levelAssociations);
    }

    return savedProgram;
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

    // Extract levelIds before updating the entity
    const { levelIds, ...courseProgramData } =
      input as UpdateCourseProgramDto & { levelIds?: number[] };

    Object.assign(courseProgram, courseProgramData);
    const savedProgram = await this.courseProgramRepo.save(courseProgram);

    // Sync level associations if provided
    if (levelIds !== undefined) {
      // Remove existing associations
      await this.courseProgramLevelRepo.delete({ courseProgramId: id });

      // Create new associations
      if (levelIds.length > 0) {
        const levelAssociations = levelIds.map((levelId: number) =>
          this.courseProgramLevelRepo.create({
            courseProgramId: id,
            levelId,
          }),
        );
        await this.courseProgramLevelRepo.save(levelAssociations);
      }
    }

    return savedProgram;
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
        .leftJoinAndSelect("step.options", "option")
        .leftJoinAndSelect("option.groupClass", "groupClass")
        .leftJoinAndSelect("cp.courseProgramLevels", "cpl")
        .leftJoinAndSelect("cpl.level", "level")
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
        .leftJoinAndSelect("step.options", "option")
        .leftJoinAndSelect("option.groupClass", "groupClass")
        .leftJoinAndSelect("cp.courseProgramLevels", "cpl")
        .leftJoinAndSelect("cpl.level", "level")
        .orderBy("step.stepOrder", "ASC")
        .addOrderBy("option.id", "ASC");
    }

    return queryBuilder.getOne();
  }

  /**
   * List all active course programs with Stripe product mapping
   */
  async findAll(includeInactive = false): Promise<CourseProgram[]> {
    const queryBuilder = this.courseProgramRepo
      .createQueryBuilder("cp")
      .leftJoinAndSelect("cp.steps", "step")
      .leftJoinAndSelect("step.options", "option")
      .leftJoinAndSelect("option.groupClass", "groupClass")
      .leftJoin(
        "stripe_product_map",
        "spm",
        "spm.scope_type = :scopeType AND spm.scope_id = cp.id",
        { scopeType: ScopeType.COURSE },
      )
      .addSelect(["spm.stripeProductId"])
      .orderBy("cp.createdAt", "DESC")
      .addOrderBy("step.stepOrder", "ASC")
      .addOrderBy("option.id", "ASC");

    if (!includeInactive) {
      queryBuilder.where("cp.isActive = :isActive", { isActive: true });
    }

    return queryBuilder.getMany();
  }

  /**
   * Browse courses with filtering and pagination (public endpoint)
   */
  async browse(params: {
    levelId?: number;
    page?: number;
    pageSize?: number;
    sortBy?: "startDate" | "title" | "price";
    sortOrder?: "asc" | "desc";
  }): Promise<{
    items: import("@thrive/shared").CourseProgramListItemDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const {
      levelId,
      page = 1,
      pageSize = 20,
      sortBy = "startDate",
      sortOrder = "asc",
    } = params;

    // Limit page size
    const limitedPageSize = Math.min(pageSize, 100);
    const skip = (page - 1) * limitedPageSize;

    // Build query
    let query = this.courseProgramRepo
      .createQueryBuilder("cp")
      .leftJoinAndSelect("cp.steps", "step")
      .leftJoinAndSelect("cp.courseProgramLevels", "cpl")
      .leftJoinAndSelect("cpl.level", "level")
      .where("cp.isActive = :isActive", { isActive: true });

    // Filter by level if provided
    if (levelId) {
      query = query.andWhere("cpl.levelId = :levelId", { levelId });
    }

    // Get total count
    const total = await query.getCount();

    // Apply sorting
    if (sortBy === "title") {
      query = query.orderBy(
        "cp.title",
        sortOrder.toUpperCase() as "ASC" | "DESC",
      );
    } else if (sortBy === "startDate") {
      // Get next cohort start date via subquery for sorting
      query = query.orderBy(
        "cp.createdAt",
        sortOrder.toUpperCase() as "ASC" | "DESC",
      );
    } else {
      query = query.orderBy(
        "cp.createdAt",
        sortOrder.toUpperCase() as "ASC" | "DESC",
      );
    }

    // Apply pagination
    query = query.skip(skip).take(limitedPageSize);

    const coursePrograms = await query.getMany();

    // Enrich with cohort and pricing data
    const items = await Promise.all(
      coursePrograms.map(async (cp) => {
        // Count available cohorts
        const availableCohortsCount = await this.dataSource
          .createQueryBuilder()
          .select("COUNT(*)", "count")
          .from("course_cohort", "cc")
          .where("cc.course_program_id = :cpId", { cpId: cp.id })
          .andWhere("cc.is_active = 1")
          .andWhere("cc.current_enrollment < cc.max_enrollment")
          .andWhere(
            "(cc.enrollment_deadline IS NULL OR cc.enrollment_deadline > NOW())",
          )
          .getRawOne<{ count: string }>();

        const availableCohorts = parseInt(availableCohortsCount?.count || "0");

        // Get next cohort start date
        const nextCohortResult = await this.dataSource
          .createQueryBuilder()
          .select("MIN(cc.start_date)", "startDate")
          .from("course_cohort", "cc")
          .where("cc.course_program_id = :cpId", { cpId: cp.id })
          .andWhere("cc.is_active = 1")
          .andWhere("cc.current_enrollment < cc.max_enrollment")
          .andWhere(
            "(cc.enrollment_deadline IS NULL OR cc.enrollment_deadline > NOW())",
          )
          .andWhere("cc.start_date >= CURDATE()")
          .getRawOne<{ startDate: string | null }>();

        const nextCohortStartDate = nextCohortResult?.startDate || null;

        // Get Stripe pricing
        const mapping = await this.stripeProductMapRepo.findOne({
          where: {
            scopeType: ScopeType.COURSE,
            scopeId: cp.id,
          },
        });

        let priceInCents: number | null = null;
        let stripePriceId: string | null = null;

        if (mapping) {
          try {
            const prices = await this.stripeProductService.listPrices(
              mapping.stripeProductId,
              true,
            );
            const activePrice = prices[0];
            priceInCents = activePrice?.unit_amount || null;
            stripePriceId = activePrice?.id || null;
          } catch {
            // Ignore Stripe errors
          }
        }

        return {
          id: cp.id,
          code: cp.code,
          title: cp.title,
          description: cp.description,
          heroImageUrl: cp.heroImageUrl,
          timezone: cp.timezone,
          isActive: cp.isActive,
          stepCount: cp.steps?.length || 0,
          priceInCents,
          stripePriceId,
          levels: (cp.courseProgramLevels || [])
            .filter((cpl) => cpl.level)
            .map((cpl) => ({
              id: cpl.level.id,
              code: cpl.level.code,
              name: cpl.level.name,
            })),
          availableCohorts,
          nextCohortStartDate,
        };
      }),
    );

    return {
      items,
      total,
      page,
      pageSize: limitedPageSize,
    };
  }

  /**
   * Enrich course program with Stripe pricing data
   */
  async enrichWithPricing(
    courseProgram: CourseProgram,
  ): Promise<CourseProgramDetailDto> {
    // Find Stripe product mapping for this course
    const mapping = await this.stripeProductMapRepo.findOne({
      where: {
        scopeType: ScopeType.COURSE,
        scopeId: courseProgram.id,
      },
    });

    // Map levels from courseProgramLevels relation
    const levels = (courseProgram.courseProgramLevels || [])
      .map((cpl) => cpl.level)
      .filter((level) => level) // Filter out any undefined levels
      .map((level) => ({
        id: level.id,
        code: level.code,
        name: level.name,
      }));

    // Transform steps to match DTO structure
    const transformedSteps = (courseProgram.steps || []).map((step) => ({
      id: step.id,
      stepOrder: step.stepOrder,
      label: step.label,
      title: step.title,
      description: step.description,
      isRequired: step.isRequired,
      options: (step.options || []).map((option) => ({
        id: option.id,
        groupClassId: option.groupClassId,
        groupClassName: option.groupClass?.title || "",
        isActive: Boolean(option.isActive),
        maxStudents: option.groupClass?.capacityMax,
      })),
    }));

    const baseData = {
      id: courseProgram.id,
      code: courseProgram.code,
      title: courseProgram.title,
      description: courseProgram.description,
      heroImageUrl: courseProgram.heroImageUrl,
      slug: courseProgram.slug,
      timezone: courseProgram.timezone,
      isActive: courseProgram.isActive,
      steps: transformedSteps,
      levels,
    };

    if (!mapping) {
      // No Stripe product mapped yet
      return {
        ...baseData,
        stripeProductId: null,
        stripePriceId: null,
        priceInCents: null,
      };
    }

    try {
      // Fetch active prices from Stripe
      const prices = await this.stripeProductService.listPrices(
        mapping.stripeProductId,
        true,
      );

      const activePrice = prices[0]; // Get the first active price

      return {
        ...baseData,
        stripeProductId: mapping.stripeProductId,
        stripePriceId: activePrice?.id || null,
        priceInCents: activePrice?.unit_amount || null,
      };
    } catch {
      // If Stripe call fails, return without pricing
      return {
        ...baseData,
        stripeProductId: mapping.stripeProductId,
        stripePriceId: null,
        priceInCents: null,
      };
    }
  }

  /**
   * Get all course programs enriched with pricing data
   */
  async findAllWithPricing(
    includeInactive = false,
  ): Promise<CourseProgramDetailDto[]> {
    const programs = await this.findAll(includeInactive);
    return Promise.all(
      programs.map((program) => this.enrichWithPricing(program)),
    );
  }

  /**
   * Soft delete a course program
   */
  async remove(id: number): Promise<void> {
    const courseProgram = await this.findOneOrFail(id);

    // Check if there are active enrollments
    const enrollmentCount = (await this.dataSource
      .createQueryBuilder()
      .select("COUNT(*)", "count")
      .from("student_course_enrollment", "sce")
      .where("sce.course_program_id = :id", { id })
      .andWhere("sce.status = :status", { status: "ACTIVE" })
      .getRawOne()) as { count: string };

    if (parseInt(enrollmentCount.count) > 0) {
      throw new BadRequestException(
        "Cannot delete course program with active enrollments. Deactivate it instead.",
      );
    }

    await this.courseProgramRepo.softRemove(courseProgram);
  }

  /**
   * Publish course to Stripe - creates product and price in Stripe
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

    // Check if already published
    const existingMapping = await this.stripeProductMapRepo.findOne({
      where: {
        serviceKey: `course_${courseProgram.code}`,
        scopeType: ScopeType.COURSE,
      },
    });

    if (existingMapping) {
      throw new ConflictException(
        `Course program "${courseProgram.code}" is already published to Stripe`,
      );
    }

    // Create Stripe product and price
    const { product, price } =
      await this.stripeProductService.createProductWithPrice(
        {
          name: courseProgram.title,
          description: courseProgram.description || undefined,
          metadata: {
            course_code: courseProgram.code,
            course_program_id: id.toString(),
            total_steps: courseProgram.steps.length.toString(),
          },
        },
        {
          amountMinor: priceInCents,
          currency,
          lookupKey: `course_${courseProgram.code}`,
          metadata: {
            course_program_id: id.toString(),
          },
        },
      );

    // Create local mapping
    const mapping = this.stripeProductMapRepo.create({
      serviceKey: `course_${courseProgram.code}`,
      stripeProductId: product.id,
      active: true,
      scopeType: ScopeType.COURSE,
      scopeId: id,
      metadata: {
        course_program_id: id,
        course_code: courseProgram.code,
        course_title: courseProgram.title,
      },
    });

    await this.stripeProductMapRepo.save(mapping);

    return {
      stripeProductId: product.id,
      stripePriceId: price.id,
    };
  }
}
