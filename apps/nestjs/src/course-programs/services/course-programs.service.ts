import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { CourseProgram } from "../entities/course-program.entity.js";
import { CourseStep } from "../entities/course-step.entity.js";
import { CreateCourseProgramDto, UpdateCourseProgramDto } from "@thrive/shared";
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
        .leftJoinAndSelect("step.options", "option")
        .leftJoinAndSelect("option.groupClass", "groupClass")
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
   * Enrich course program with Stripe pricing data
   */
  async enrichWithPricing(courseProgram: CourseProgram): Promise<{
    id: number;
    code: string;
    title: string;
    description: string | null;
    timezone: string;
    isActive: boolean;
    stripeProductId: string | null;
    stripePriceId: string | null;
    priceInCents: number | null;
    steps: CourseStep[];
  }> {
    // Find Stripe product mapping for this course
    const mapping = await this.stripeProductMapRepo.findOne({
      where: {
        scopeType: ScopeType.COURSE,
        scopeId: courseProgram.id,
      },
    });

    const baseData = {
      id: courseProgram.id,
      code: courseProgram.code,
      title: courseProgram.title,
      description: courseProgram.description,
      timezone: courseProgram.timezone,
      isActive: courseProgram.isActive,
      steps: courseProgram.steps || [],
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
  async findAllWithPricing(includeInactive = false): Promise<
    {
      id: number;
      code: string;
      title: string;
      description: string | null;
      timezone: string;
      isActive: boolean;
      stripeProductId: string | null;
      stripePriceId: string | null;
      priceInCents: number | null;
      steps: CourseStep[];
    }[]
  > {
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
