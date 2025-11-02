import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Query,
  Body,
  Request,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { CourseProgramsService } from "../services/course-programs.service.js";
import { CohortsService } from "../services/cohorts.service.js";
import { StripeProductService } from "../../common/services/stripe-product.service.js";
import { CourseEnrollmentService } from "../services/course-enrollment.service.js";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StudentPackage } from "../../packages/entities/student-package.entity.js";
import { Student } from "../../students/entities/student.entity.js";
import {
  ScopeType,
  StripeProductMap,
} from "../../payments/entities/stripe-product-map.entity.js";
import type { Request as ExpressRequest } from "express";

/**
 * Public endpoints for course programs
 * Base path: /course-programs
 *
 * Simplified architecture:
 * - Enrollments are now tracked via StudentPackage (use /packages/my-credits)
 * - Course purchases handled by existing Stripe webhook → StudentPackage flow
 */
@Controller("course-programs")
export class CourseProgramsController {
  constructor(
    private readonly courseProgramsService: CourseProgramsService,
    private readonly cohortsService: CohortsService,
    private readonly stripeProductService: StripeProductService,
    private readonly courseEnrollmentService: CourseEnrollmentService,
    @InjectRepository(StudentPackage)
    private readonly studentPackageRepo: Repository<StudentPackage>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(StripeProductMap)
    private readonly stripeProductMapRepo: Repository<StripeProductMap>,
  ) {}

  /**
   * Browse courses with filtering and pagination
   * GET /course-programs/browse?levelId=1&page=1&pageSize=10
   */
  @Get("browse")
  async browse(
    @Query("levelId") levelId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("sortBy") sortBy?: "startDate" | "title" | "price",
    @Query("sortOrder") sortOrder?: "asc" | "desc",
  ) {
    return this.courseProgramsService.browse({
      levelId: levelId ? parseInt(levelId) : undefined,
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
      sortBy,
      sortOrder,
    });
  }

  /**
   * Get course program detail by code
   * GET /course-programs/:code
   */
  @Get(":code")
  async findByCode(@Param("code") code: string) {
    const courseProgram = await this.courseProgramsService.findByCode(
      code,
      true,
    );

    if (!courseProgram) {
      throw new NotFoundException(
        `Course program with code "${code}" not found`,
      );
    }

    return this.courseProgramsService.enrichWithPricing(courseProgram);
  }

  /**
   * Get available cohorts for a course
   * GET /course-programs/:code/cohorts
   */
  @Get(":code/cohorts")
  async getCohorts(@Param("code") code: string) {
    const courseProgram = await this.courseProgramsService.findByCode(code);

    if (!courseProgram) {
      throw new NotFoundException(
        `Course program with code "${code}" not found`,
      );
    }

    return this.cohortsService.findPublicByCourseProgram(courseProgram.id);
  }

  /**
   * Get cohort detail with sessions
   * GET /course-programs/:code/cohorts/:cohortId
   */
  @Get(":code/cohorts/:cohortId")
  async getCohortDetail(
    @Param("code") code: string,
    @Param("cohortId", ParseIntPipe) cohortId: number,
  ) {
    const courseProgram = await this.courseProgramsService.findByCode(code);

    if (!courseProgram) {
      throw new NotFoundException(
        `Course program with code "${code}" not found`,
      );
    }

    return this.cohortsService.findOneDetail(cohortId);
  }

  /**
   * Create Stripe Checkout Session for cohort enrollment
   * POST /course-programs/:code/cohorts/:cohortId/enroll
   */
  @Post(":code/cohorts/:cohortId/enroll")
  async enrollInCohort(
    @Param("code") code: string,
    @Param("cohortId", ParseIntPipe) cohortId: number,
    @Body() body: { successUrl?: string; cancelUrl?: string },
    @Request() req: ExpressRequest,
  ) {
    // Extract user ID from X-Auth headers (injected by Nginx)
    const userId = req.headers["x-auth-user-id"] as string;

    if (!userId) {
      throw new UnauthorizedException("Authentication required");
    }

    // 1. Find course
    const courseProgram = await this.courseProgramsService.findByCode(
      code,
      true,
    );

    if (!courseProgram || !courseProgram.isActive) {
      throw new NotFoundException("Course not found or not active");
    }

    // 2. Find and validate cohort
    const cohort = await this.cohortsService.findOneDetail(cohortId);

    if (!cohort || cohort.courseProgramId !== courseProgram.id) {
      throw new NotFoundException("Cohort not found");
    }

    if (!cohort.isActive) {
      throw new BadRequestException("Cohort is not active");
    }

    if (cohort.currentEnrollment >= cohort.maxEnrollment) {
      throw new BadRequestException("Cohort is full");
    }

    const now = new Date();
    if (
      cohort.enrollmentDeadline &&
      new Date(cohort.enrollmentDeadline) < now
    ) {
      throw new BadRequestException("Enrollment deadline has passed");
    }

    // 3. Get student record
    const student = await this.studentRepo.findOne({
      where: { userId: parseInt(userId, 10) },
    });

    if (!student) {
      throw new NotFoundException("Student record not found");
    }

    // 4. Check if student is already enrolled
    const existingPackage = await this.studentPackageRepo.findOne({
      where: {
        studentId: student.id,
        stripeProductMap: {
          scopeType: ScopeType.COURSE,
          scopeId: courseProgram.id,
        },
      },
      relations: ["stripeProductMap"],
    });

    if (existingPackage) {
      throw new ConflictException("You are already enrolled in this course");
    }

    // 5. Get Stripe product mapping for this course
    const stripeMap = await this.stripeProductMapRepo.findOne({
      where: {
        scopeType: ScopeType.COURSE,
        scopeId: courseProgram.id,
        active: true,
      },
    });

    if (!stripeMap || !stripeMap.stripeProductId) {
      throw new BadRequestException(
        "Course is not available for purchase at this time",
      );
    }

    // 6. Get active price from Stripe
    const stripe = this.stripeProductService.getStripeClient();
    const prices = await stripe.prices.list({
      product: stripeMap.stripeProductId,
      active: true,
      limit: 1,
    });

    if (prices.data.length === 0) {
      throw new BadRequestException(
        "No active price found for this course. Please contact support.",
      );
    }

    const stripePrice = prices.data[0];

    // 7. Create Stripe Checkout Session
    // Use request origin for URLs to work across environments
    const origin =
      req.headers.origin ||
      req.headers.referer?.split("/").slice(0, 3).join("/") ||
      "http://localhost:8080";
    const successUrl =
      body.successUrl ||
      `${origin}/enrollment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = body.cancelUrl || `${origin}/courses/${code}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: student.user?.email,
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product_type: "course_enrollment",
        course_program_id: courseProgram.id.toString(),
        course_code: courseProgram.code,
        cohort_id: cohort.id.toString(),
        cohort_name: cohort.name,
        student_id: student.id.toString(),
        user_id: userId,
        stripe_product_map_id: stripeMap.id.toString(),
      },
      payment_intent_data: {
        metadata: {
          product_type: "course_enrollment",
          course_program_id: courseProgram.id.toString(),
          cohort_id: cohort.id.toString(),
          student_id: student.id.toString(),
          user_id: userId,
          price_id: stripePrice.id,
          product_id: stripeMap.stripeProductId,
          stripe_product_map_id: stripeMap.id.toString(),
        },
      },
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Get enrollment session information from Stripe session ID
   * GET /course-programs/enrollment/session/:sessionId
   *
   * This endpoint retrieves information about a completed enrollment
   * after the student returns from Stripe checkout
   */
  @Get("enrollment/session/:sessionId")
  async getEnrollmentSession(
    @Param("sessionId") sessionId: string,
    @Request() req: ExpressRequest,
  ) {
    // Extract user ID from X-Auth headers (injected by Nginx)
    const userId = req.headers["x-auth-user-id"] as string;

    if (!userId) {
      throw new UnauthorizedException("Authentication required");
    }

    // Get student record
    const student = await this.studentRepo.findOne({
      where: { userId: parseInt(userId, 10) },
    });

    if (!student) {
      throw new NotFoundException("Student record not found");
    }

    return this.courseEnrollmentService.getEnrollmentSessionInfo(
      sessionId,
      student.id,
    );
  }
}
