import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import Stripe from "stripe";
import { CourseProgram } from "../entities/course-program.entity.js";
import { CourseCohort } from "../entities/course-cohort.entity.js";
import { StudentPackage } from "../../packages/entities/student-package.entity.js";
import { StripeProductMap } from "../../payments/entities/stripe-product-map.entity.js";
import type { EnrollInCohortDto } from "@thrive/shared";

@Injectable()
export class CourseEnrollmentService {
  private stripe: Stripe;
  private readonly logger = new Logger(CourseEnrollmentService.name);

  constructor(
    @InjectRepository(CourseProgram)
    private courseProgramRepo: Repository<CourseProgram>,
    @InjectRepository(CourseCohort)
    private cohortRepo: Repository<CourseCohort>,
    @InjectRepository(StudentPackage)
    private packageRepo: Repository<StudentPackage>,
    @InjectRepository(StripeProductMap)
    private stripeMapRepo: Repository<StripeProductMap>,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {
    const secretKey = this.configService.get<string>("stripe.secretKey");
    if (!secretKey) {
      throw new Error("Stripe secret key is not configured");
    }
    this.stripe = new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil",
    });
  }

  async createCheckoutSession(
    studentId: number,
    courseCode: string,
    cohortId: number,
    dto: EnrollInCohortDto,
  ) {
    // 1. Find course
    const course = await this.courseProgramRepo.findOne({
      where: { code: courseCode, isActive: true },
    });

    if (!course) {
      throw new BadRequestException("Course not found or not active");
    }

    // 2. Find cohort and validate
    const cohort = await this.cohortRepo.findOne({
      where: { id: cohortId, courseProgramId: course.id },
    });

    if (!cohort) {
      throw new BadRequestException("Cohort not found");
    }

    if (!cohort.isActive) {
      throw new BadRequestException("Cohort is not active");
    }

    if (cohort.currentEnrollment >= cohort.maxEnrollment) {
      throw new BadRequestException("Cohort is full");
    }

    const now = new Date();
    if (cohort.enrollmentDeadline && cohort.enrollmentDeadline < now) {
      throw new BadRequestException("Enrollment deadline has passed");
    }

    // 3. Check student doesn't already own this course
    const existingPackage = await this.packageRepo.findOne({
      where: {
        studentId,
        metadata: {
          courseProgramId: course.id,
        } as unknown as Record<string, string>,
      },
    });

    if (existingPackage) {
      throw new ConflictException("You are already enrolled in this course");
    }

    // 4. Get Stripe product/price mapping
    const stripeMap = await this.stripeMapRepo.findOne({
      where: {
        serviceKey: `course_${courseCode}`,
        active: true,
      },
    });

    if (!stripeMap) {
      throw new BadRequestException("Course is not available for purchase");
    }

    // 5. Get the active price from Stripe
    const prices = await this.stripe.prices.list({
      product: stripeMap.stripeProductId,
      active: true,
      limit: 1,
    });

    if (prices.data.length === 0) {
      throw new BadRequestException("Course price not found");
    }

    const stripePriceId = prices.data[0].id;

    // 6. Create Stripe checkout session
    const baseUrl =
      this.configService.get<string>("WP_BASE_URL") ||
      this.configService.get<string>("app.wpBaseUrl");

    const successUrl =
      dto.successUrl ||
      `${baseUrl}/enrollment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = dto.cancelUrl || `${baseUrl}/courses/${courseCode}`;

    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product_type: "course_enrollment",
        student_id: studentId.toString(),
        course_program_id: course.id.toString(),
        course_code: course.code,
        cohort_id: cohort.id.toString(),
        cohort_name: cohort.name,
        stripe_product_map_id: stripeMap.id.toString(),
      },
      payment_intent_data: {
        metadata: {
          product_type: "course_enrollment",
          student_id: studentId.toString(),
          course_program_id: course.id.toString(),
          course_code: course.code,
          cohort_id: cohort.id.toString(),
          cohort_name: cohort.name,
          stripe_product_map_id: stripeMap.id.toString(),
        },
      },
    });

    this.logger.log(
      `Created Stripe checkout session ${session.id} for student ${studentId}, cohort ${cohortId}`,
    );

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async getEnrollmentSessionInfo(stripeSessionId: string, studentId: number) {
    // Retrieve the Stripe session
    const session =
      await this.stripe.checkout.sessions.retrieve(stripeSessionId);

    // Verify this session belongs to the requesting student
    if (session.metadata?.student_id !== studentId.toString()) {
      throw new NotFoundException("Session not found");
    }

    // Find the student package created from this payment
    const studentPackage = await this.packageRepo.findOne({
      where: {
        sourcePaymentId: session.payment_intent as string,
        studentId,
      },
    });

    if (!studentPackage) {
      throw new NotFoundException(
        "Enrollment not found. Please contact support if payment was successful.",
      );
    }

    return {
      packageId: studentPackage.id,
      courseProgramId: studentPackage.metadata?.courseProgramId,
      cohortId: studentPackage.metadata?.cohortId,
      courseCode: studentPackage.metadata?.courseCode,
      cohortName: studentPackage.metadata?.cohortName,
    };
  }
}
