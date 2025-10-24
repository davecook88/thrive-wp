import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CourseStep } from "../entities/course-step.entity.js";
import { CourseStepOption } from "../entities/course-step-option.entity.js";
import { GroupClass } from "../../group-classes/entities/group-class.entity.js";
import {
  CreateCourseStepDto,
  UpdateCourseStepDto,
  AttachStepOptionDto,
} from "@thrive/shared";

@Injectable()
export class CourseStepsService {
  constructor(
    @InjectRepository(CourseStep)
    private readonly courseStepRepo: Repository<CourseStep>,
    @InjectRepository(CourseStepOption)
    private readonly stepOptionRepo: Repository<CourseStepOption>,
    @InjectRepository(GroupClass)
    private readonly groupClassRepo: Repository<GroupClass>,
  ) {}

  /**
   * Create a new course step
   */
  async create(input: CreateCourseStepDto): Promise<CourseStep> {
    // Check for duplicate label within course
    const existingLabel = await this.courseStepRepo.findOne({
      where: {
        courseProgramId: input.courseProgramId,
        label: input.label,
      },
    });

    if (existingLabel) {
      throw new ConflictException(
        `Step with label "${input.label}" already exists in this course`,
      );
    }

    // Check for duplicate stepOrder within course
    const existingOrder = await this.courseStepRepo.findOne({
      where: {
        courseProgramId: input.courseProgramId,
        stepOrder: input.stepOrder,
      },
    });

    if (existingOrder) {
      throw new ConflictException(
        `Step with order ${input.stepOrder} already exists in this course`,
      );
    }

    const step = this.courseStepRepo.create(input);
    return this.courseStepRepo.save(step);
  }

  /**
   * Update an existing course step
   */
  async update(id: number, input: UpdateCourseStepDto): Promise<CourseStep> {
    const step = await this.findOneOrFail(id);

    // Check for duplicate label if changing
    if (input.label && input.label !== step.label) {
      const existingLabel = await this.courseStepRepo.findOne({
        where: {
          courseProgramId: step.courseProgramId,
          label: input.label,
        },
      });

      if (existingLabel) {
        throw new ConflictException(
          `Step with label "${input.label}" already exists in this course`,
        );
      }
    }

    // Check for duplicate stepOrder if changing
    if (input.stepOrder && input.stepOrder !== step.stepOrder) {
      const existingOrder = await this.courseStepRepo.findOne({
        where: {
          courseProgramId: step.courseProgramId,
          stepOrder: input.stepOrder,
        },
      });

      if (existingOrder) {
        throw new ConflictException(
          `Step with order ${input.stepOrder} already exists in this course`,
        );
      }
    }

    Object.assign(step, input);
    return this.courseStepRepo.save(step);
  }

  /**
   * Find step by ID
   */
  async findOne(
    id: number,
    includeOptions = false,
  ): Promise<CourseStep | null> {
    const queryBuilder = this.courseStepRepo
      .createQueryBuilder("step")
      .where("step.id = :id", { id });

    if (includeOptions) {
      queryBuilder
        .leftJoinAndSelect("step.stepOptions", "option")
        .leftJoinAndSelect("option.groupClass", "groupClass")
        .orderBy("option.id", "ASC");
    }

    return queryBuilder.getOne();
  }

  /**
   * Find or fail
   */
  async findOneOrFail(id: number, includeOptions = false): Promise<CourseStep> {
    const step = await this.findOne(id, includeOptions);

    if (!step) {
      throw new NotFoundException(`Course step with ID ${id} not found`);
    }

    return step;
  }

  /**
   * Delete a course step
   */
  async remove(id: number): Promise<void> {
    const step = await this.findOneOrFail(id);

    // Check if students have booked this step
    const progressCount = (await this.courseStepRepo.manager
      .createQueryBuilder()
      .select("COUNT(*)", "count")
      .from("student_course_progress", "scp")
      .where("scp.course_step_id = :id", { id })
      .andWhere("scp.status IN (:...statuses)", {
        statuses: ["BOOKED", "COMPLETED"],
      })
      .getRawOne()) as { count: string };

    if (parseInt(progressCount.count) > 0) {
      throw new BadRequestException(
        "Cannot delete step with active or completed bookings",
      );
    }

    await this.courseStepRepo.softRemove(step);
  }

  /**
   * Attach a group class as an option for this step
   */
  async attachOption(input: AttachStepOptionDto): Promise<CourseStepOption> {
    // Verify step exists
    await this.findOneOrFail(input.courseStepId);

    // Verify group class exists
    const groupClass = await this.groupClassRepo.findOne({
      where: { id: input.groupClassId },
    });

    if (!groupClass) {
      throw new NotFoundException(
        `Group class with ID ${input.groupClassId} not found`,
      );
    }

    // Check for duplicate attachment
    const existing = await this.stepOptionRepo.findOne({
      where: {
        courseStepId: input.courseStepId,
        groupClassId: input.groupClassId,
      },
      withDeleted: true, // Include soft-deleted to handle re-attachment
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException(
        "This group class is already attached to this step",
      );
    }

    // If soft-deleted, restore it
    if (existing && existing.deletedAt) {
      existing.deletedAt = undefined;
      existing.isActive = input.isActive;
      return this.stepOptionRepo.save(existing);
    }

    // Create new attachment
    const option = this.stepOptionRepo.create(input);
    return this.stepOptionRepo.save(option);
  }

  /**
   * Detach (soft delete) a step option
   */
  async detachOption(courseStepOptionId: number): Promise<void> {
    const option = await this.stepOptionRepo.findOne({
      where: { id: courseStepOptionId },
    });

    if (!option) {
      throw new NotFoundException(
        `Step option with ID ${courseStepOptionId} not found`,
      );
    }

    // Check if students have booked this specific option
    const progressCount = (await this.stepOptionRepo.manager
      .createQueryBuilder()
      .select("COUNT(*)", "count")
      .from("student_course_progress", "scp")
      .where("scp.selected_option_id = :id", { id: courseStepOptionId })
      .andWhere("scp.status IN (:...statuses)", {
        statuses: ["BOOKED", "COMPLETED"],
      })
      .getRawOne()) as { count: string };

    if (parseInt(progressCount.count) > 0) {
      throw new BadRequestException(
        "Cannot detach option with active or completed bookings",
      );
    }

    await this.stepOptionRepo.softRemove(option);
  }

  /**
   * List all options for a step
   */
  async listOptions(courseStepId: number): Promise<CourseStepOption[]> {
    return this.stepOptionRepo.find({
      where: { courseStepId },
      relations: ["groupClass"],
      order: { id: "ASC" },
    });
  }
}
