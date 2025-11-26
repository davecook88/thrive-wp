import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, Not } from "typeorm";
import { Testimonial } from "./entities/testimonial.entity.js";
import { Student } from "../students/entities/student.entity.js";
import { Teacher } from "../teachers/entities/teacher.entity.js";
import { CourseProgram } from "../course-programs/entities/course-program.entity.js";
import { StudentPackage } from "../packages/entities/student-package.entity.js";
import { Booking } from "../payments/entities/booking.entity.js";
import {
  CreateTestimonialDto,
  AdminCreateTestimonialDto,
  UpdateTestimonialDto,
  ApproveTestimonialDto,
  RejectTestimonialDto,
  TestimonialResponseDto,
  TestimonialEligibilityDto,
  PaginatedTestimonialsResponse,
} from "@thrive/shared";

@Injectable()
export class TestimonialsService {
  constructor(
    @InjectRepository(Testimonial)
    private readonly testimonialRepo: Repository<Testimonial>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(CourseProgram)
    private readonly courseProgramRepo: Repository<CourseProgram>,
    @InjectRepository(StudentPackage)
    private readonly studentPackageRepo: Repository<StudentPackage>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  /**
   * Check student eligibility to submit testimonials
   * Returns what the student is allowed to review
   */
  async checkEligibility(
    studentId: number,
  ): Promise<TestimonialEligibilityDto> {
    // Check if student exists
    const student = await this.studentRepo.findOne({
      where: { id: studentId },
      relations: ["user"],
    });

    if (!student) {
      throw new NotFoundException("Student not found");
    }

    // Check if student has attended at least one session (for general testimonials)
    const hasAttendedSession = await this.bookingRepo.count({
      where: { studentId },
    });
    const canSubmitGeneral = hasAttendedSession > 0;

    // Get teachers student has studied with
    const teacherBookings = await this.bookingRepo
      .createQueryBuilder("booking")
      .select("DISTINCT session.teacher_id", "teacherId")
      .innerJoin("booking.session", "session")
      .where("booking.student_id = :studentId", { studentId })
      .andWhere("session.teacher_id IS NOT NULL")
      .getRawMany<{ teacherId: string | number }>();

    const teacherIds = teacherBookings.map((b) => Number(b.teacherId));

    // Get existing teacher testimonials
    const existingTeacherTestimonials = await this.testimonialRepo.find({
      where: {
        studentId,
        teacherId: Not(IsNull()),
      },
      select: ["teacherId"],
    });
    const reviewedTeacherIds = new Set(
      existingTeacherTestimonials
        .map((t) => t.teacherId)
        .filter((id): id is number => id !== null),
    );

    // Load teacher details
    const eligibleTeachers = [];
    if (teacherIds.length > 0) {
      const teachers = await this.teacherRepo.find({
        where: teacherIds.map((id) => ({ id })),
        relations: ["user"],
      });

      for (const teacher of teachers) {
        const hasExisting = reviewedTeacherIds.has(teacher.id);
        eligibleTeachers.push({
          teacherId: teacher.id,
          teacherName:
            `${teacher.user?.firstName || ""} ${teacher.user?.lastName || ""}`.trim() ||
            "Teacher",
          canSubmit: !hasExisting,
          hasExistingTestimonial: hasExisting,
        });
      }
    }

    // Get courses student is enrolled in
    const courseEnrollments = await this.studentPackageRepo
      .createQueryBuilder("sp")
      .select(
        "DISTINCT JSON_UNQUOTE(JSON_EXTRACT(sp.metadata, '$.courseProgramId'))",
        "courseProgramId",
      )
      .where("sp.student_id = :studentId", { studentId })
      .andWhere("JSON_EXTRACT(sp.metadata, '$.courseProgramId') IS NOT NULL")
      .andWhere("sp.deleted_at IS NULL")
      .getRawMany<{ courseProgramId: string | null }>();

    const courseIds = courseEnrollments
      .map((e) => Number(e.courseProgramId))
      .filter((id): id is number => Number.isFinite(id));

    // Get existing course testimonials
    const existingCourseTestimonials = await this.testimonialRepo.find({
      where: {
        studentId,
        courseProgramId: Not(IsNull()),
      },
      select: ["courseProgramId"],
    });
    const reviewedCourseIds = new Set(
      existingCourseTestimonials
        .map((t) => t.courseProgramId)
        .filter((id): id is number => id !== null),
    );

    // Load course details
    const eligibleCourses = [];
    if (courseIds.length > 0) {
      const courses = await this.courseProgramRepo.find({
        where: courseIds.map((id) => ({ id })),
      });

      for (const course of courses) {
        const hasExisting = reviewedCourseIds.has(course.id);
        eligibleCourses.push({
          courseProgramId: course.id,
          courseProgramTitle: course.title,
          canSubmit: !hasExisting,
          hasExistingTestimonial: hasExisting,
        });
      }
    }

    return {
      canSubmitGeneral,
      eligibleTeachers,
      eligibleCourses,
    };
  }

  /**
   * Create a new testimonial with eligibility validation
   */
  async create(
    studentId: number,
    dto: CreateTestimonialDto,
  ): Promise<Testimonial> {
    // Verify student exists
    const student = await this.studentRepo.findOne({
      where: { id: studentId },
      relations: ["user"],
    });

    if (!student) {
      throw new NotFoundException("Student not found");
    }

    // Validate eligibility based on testimonial type
    if (dto.teacherId) {
      // Teacher-specific testimonial
      await this.validateTeacherEligibility(studentId, dto.teacherId);
    } else if (dto.courseProgramId) {
      // Course-specific testimonial
      await this.validateCourseEligibility(studentId, dto.courseProgramId);
    } else {
      // General platform testimonial
      await this.validateGeneralEligibility(studentId);
    }

    // Check for duplicate testimonial
    const existing = await this.findExistingTestimonial(
      studentId,
      dto.teacherId ?? null,
      dto.courseProgramId ?? null,
    );

    if (existing) {
      throw new ConflictException(
        "You have already submitted a testimonial for this teacher/course",
      );
    }

    // Create testimonial
    const testimonial = this.testimonialRepo.create({
      studentId,
      teacherId: dto.teacherId ?? null,
      courseProgramId: dto.courseProgramId ?? null,
      rating: dto.rating,
      comment: dto.comment ?? null,
      tags: dto.tags ?? null,
      status: "pending", // Always starts as pending
      isFeatured: false,
    });

    return this.testimonialRepo.save(testimonial);
  }

  /**
   * Create a testimonial as admin (for importing legacy reviews)
   * Bypasses all eligibility checks and allows setting initial status
   */
  async createAsAdmin(
    dto: AdminCreateTestimonialDto,
    adminId: number,
  ): Promise<Testimonial> {
    // Verify student exists
    const student = await this.studentRepo.findOne({
      where: { id: dto.studentId },
      relations: ["user"],
    });

    if (!student) {
      throw new NotFoundException("Student not found");
    }

    // Verify teacher exists if provided
    if (dto.teacherId) {
      const teacher = await this.teacherRepo.findOne({
        where: { id: dto.teacherId },
      });

      if (!teacher) {
        throw new NotFoundException("Teacher not found");
      }
    }

    // Verify course exists if provided
    if (dto.courseProgramId) {
      const course = await this.courseProgramRepo.findOne({
        where: { id: dto.courseProgramId },
      });

      if (!course) {
        throw new NotFoundException("Course program not found");
      }
    }

    // Create testimonial with admin-specified settings
    const testimonial = this.testimonialRepo.create({
      studentId: dto.studentId,
      teacherId: dto.teacherId ?? null,
      courseProgramId: dto.courseProgramId ?? null,
      rating: dto.rating,
      comment: dto.comment ?? null,
      tags: dto.tags ?? null,
      status: dto.status ?? "approved", // Default to approved for admin imports
      isFeatured: dto.isFeatured ?? false,
      adminFeedback: dto.adminFeedback ?? null,
      reviewedAt: dto.status === "approved" ? new Date() : null,
      reviewedByAdminId: dto.status === "approved" ? adminId : null,
    });

    return this.testimonialRepo.save(testimonial);
  }

  /**
   * Validate teacher eligibility
   */
  private async validateTeacherEligibility(
    studentId: number,
    teacherId: number,
  ): Promise<void> {
    // Check teacher exists
    const teacher = await this.teacherRepo.findOne({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException("Teacher not found");
    }

    // Check if student has attended a session with this teacher
    const hasStudiedWith = await this.bookingRepo
      .createQueryBuilder("booking")
      .innerJoin("booking.session", "session")
      .where("booking.student_id = :studentId", { studentId })
      .andWhere("session.teacher_id = :teacherId", { teacherId })
      .getCount();

    if (hasStudiedWith === 0) {
      throw new ForbiddenException(
        "You must attend a session with this teacher before submitting a testimonial",
      );
    }
  }

  /**
   * Validate course eligibility
   */
  private async validateCourseEligibility(
    studentId: number,
    courseProgramId: number,
  ): Promise<void> {
    // Check course exists
    const course = await this.courseProgramRepo.findOne({
      where: { id: courseProgramId },
    });

    if (!course) {
      throw new NotFoundException("Course program not found");
    }

    // Check if student is enrolled in this course by checking metadata
    const isEnrolled = await this.studentPackageRepo
      .createQueryBuilder("sp")
      .where("sp.student_id = :studentId", { studentId })
      .andWhere(
        "JSON_EXTRACT(sp.metadata, '$.courseProgramId') = :courseProgramId",
        { courseProgramId },
      )
      .andWhere("sp.deleted_at IS NULL")
      .getCount();

    if (isEnrolled === 0) {
      throw new ForbiddenException(
        "You must be enrolled in this course before submitting a testimonial",
      );
    }
  }

  /**
   * Validate general testimonial eligibility
   */
  private async validateGeneralEligibility(studentId: number): Promise<void> {
    // Check if student has attended at least one session
    const hasAttendedSession = await this.bookingRepo.count({
      where: { studentId },
    });

    if (hasAttendedSession === 0) {
      throw new ForbiddenException(
        "You must attend at least one session before submitting a testimonial",
      );
    }
  }

  /**
   * Find existing testimonial for same student + context
   */
  private async findExistingTestimonial(
    studentId: number,
    teacherId: number | null,
    courseProgramId: number | null,
  ): Promise<Testimonial | null> {
    if (teacherId) {
      return this.testimonialRepo.findOne({
        where: { studentId, teacherId },
      });
    } else if (courseProgramId) {
      return this.testimonialRepo.findOne({
        where: { studentId, courseProgramId },
      });
    } else {
      // General testimonial - both must be null
      return this.testimonialRepo.findOne({
        where: { studentId, teacherId: IsNull(), courseProgramId: IsNull() },
      });
    }
  }

  /**
   * Find all public (approved) testimonials with filtering
   */
  async findAllPublic(filters?: {
    teacherId?: number;
    courseProgramId?: number;
    limit?: number;
    minRating?: number;
    featuredOnly?: boolean;
  }): Promise<TestimonialResponseDto[]> {
    let queryBuilder = this.testimonialRepo
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.student", "student")
      .leftJoinAndSelect("student.user", "studentUser")
      .leftJoinAndSelect("t.teacher", "teacher")
      .leftJoinAndSelect("teacher.user", "teacherUser")
      .leftJoinAndSelect("t.courseProgram", "courseProgram")
      .where("t.status = :status", { status: "approved" })
      .orderBy("t.created_at", "DESC");

    // Apply filters
    if (filters?.teacherId) {
      queryBuilder = queryBuilder.andWhere("t.teacher_id = :teacherId", {
        teacherId: filters.teacherId,
      });
    }

    if (filters?.courseProgramId) {
      queryBuilder = queryBuilder.andWhere(
        "t.course_program_id = :courseProgramId",
        {
          courseProgramId: filters.courseProgramId,
        },
      );
    }

    if (filters?.minRating) {
      queryBuilder = queryBuilder.andWhere("t.rating >= :minRating", {
        minRating: filters.minRating,
      });
    }

    if (filters?.featuredOnly) {
      queryBuilder = queryBuilder.andWhere("t.is_featured = :isFeatured", {
        isFeatured: true,
      });
    }

    if (filters?.limit) {
      queryBuilder = queryBuilder.limit(filters.limit);
    }

    const testimonials = await queryBuilder.getMany();
    return testimonials.map((t) => this.toResponseDto(t));
  }

  /**
   * Find all testimonials for admin (with pagination and filters)
   */
  async findAllForAdmin(filters?: {
    status?: string;
    teacherId?: number;
    courseProgramId?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedTestimonialsResponse> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    let queryBuilder = this.testimonialRepo
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.student", "student")
      .leftJoinAndSelect("student.user", "studentUser")
      .leftJoinAndSelect("t.teacher", "teacher")
      .leftJoinAndSelect("teacher.user", "teacherUser")
      .leftJoinAndSelect("t.courseProgram", "courseProgram")
      .leftJoinAndSelect("t.reviewedByAdmin", "admin")
      .leftJoinAndSelect("admin.user", "adminUser")
      .orderBy("t.created_at", "DESC");

    // Apply filters
    if (filters?.status) {
      queryBuilder = queryBuilder.andWhere("t.status = :status", {
        status: filters.status,
      });
    }

    if (filters?.teacherId) {
      queryBuilder = queryBuilder.andWhere("t.teacher_id = :teacherId", {
        teacherId: filters.teacherId,
      });
    }

    if (filters?.courseProgramId) {
      queryBuilder = queryBuilder.andWhere(
        "t.course_program_id = :courseProgramId",
        {
          courseProgramId: filters.courseProgramId,
        },
      );
    }

    const [testimonials, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      testimonials: testimonials.map((t) => this.toResponseDto(t, true)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get student's own testimonials
   */
  async findByStudent(studentId: number): Promise<TestimonialResponseDto[]> {
    const testimonials = await this.testimonialRepo.find({
      where: { studentId },
      relations: [
        "student",
        "student.user",
        "teacher",
        "teacher.user",
        "courseProgram",
      ],
      order: { createdAt: "DESC" },
    });

    return testimonials.map((t) => this.toResponseDto(t, true));
  }

  /**
   * Approve a testimonial
   */
  async approve(
    id: number,
    adminId: number,
    dto?: ApproveTestimonialDto,
  ): Promise<void> {
    const testimonial = await this.testimonialRepo.findOne({ where: { id } });

    if (!testimonial) {
      throw new NotFoundException("Testimonial not found");
    }

    testimonial.status = "approved";
    testimonial.reviewedAt = new Date();
    testimonial.reviewedByAdminId = adminId;
    testimonial.adminFeedback = dto?.adminFeedback ?? null;

    await this.testimonialRepo.save(testimonial);
  }

  /**
   * Reject a testimonial
   */
  async reject(
    id: number,
    adminId: number,
    dto: RejectTestimonialDto,
  ): Promise<void> {
    const testimonial = await this.testimonialRepo.findOne({ where: { id } });

    if (!testimonial) {
      throw new NotFoundException("Testimonial not found");
    }

    testimonial.status = "rejected";
    testimonial.reviewedAt = new Date();
    testimonial.reviewedByAdminId = adminId;
    testimonial.adminFeedback = dto.adminFeedback;

    await this.testimonialRepo.save(testimonial);
  }

  /**
   * Toggle featured status
   */
  async toggleFeatured(id: number): Promise<void> {
    const testimonial = await this.testimonialRepo.findOne({ where: { id } });

    if (!testimonial) {
      throw new NotFoundException("Testimonial not found");
    }

    testimonial.isFeatured = !testimonial.isFeatured;
    await this.testimonialRepo.save(testimonial);
  }

  /**
   * Update testimonial (admin only)
   */
  async update(id: number, dto: UpdateTestimonialDto): Promise<Testimonial> {
    const testimonial = await this.testimonialRepo.findOne({ where: { id } });

    if (!testimonial) {
      throw new NotFoundException("Testimonial not found");
    }

    Object.assign(testimonial, dto);
    return this.testimonialRepo.save(testimonial);
  }

  /**
   * Soft delete a testimonial
   */
  async delete(id: number): Promise<void> {
    const testimonial = await this.testimonialRepo.findOne({ where: { id } });

    if (!testimonial) {
      throw new NotFoundException("Testimonial not found");
    }

    await this.testimonialRepo.softRemove(testimonial);
  }

  /**
   * Get creation options for admin testimonial creation form
   */
  async getCreationOptions(): Promise<{
    students: Array<{ id: number; name: string; email: string }>;
    teachers: Array<{ id: number; name: string }>;
    courses: Array<{ id: number; title: string }>;
  }> {
    // Get all students
    const students = await this.studentRepo.find({
      relations: ["user"],
      order: { id: "ASC" },
    });

    const studentOptions = students.map((s) => ({
      id: s.id,
      name:
        `${s.user?.firstName || ""} ${s.user?.lastName || ""}`.trim() ||
        "Unnamed Student",
      email: s.user?.email || "",
    }));

    // Get all teachers
    const teachers = await this.teacherRepo.find({
      relations: ["user"],
      order: { id: "ASC" },
    });

    const teacherOptions = teachers.map((t) => ({
      id: t.id,
      name:
        `${t.user?.firstName || ""} ${t.user?.lastName || ""}`.trim() ||
        "Unnamed Teacher",
    }));

    // Get all courses
    const courses = await this.courseProgramRepo.find({
      order: { title: "ASC" },
    });

    const courseOptions = courses.map((c) => ({
      id: c.id,
      title: c.title,
    }));

    return {
      students: studentOptions,
      teachers: teacherOptions,
      courses: courseOptions,
    };
  }

  /**
   * Convert entity to DTO
   */
  private toResponseDto(
    testimonial: Testimonial,
    includeAdminData = false,
  ): TestimonialResponseDto {
    const studentName =
      `${testimonial.student?.user?.firstName || ""} ${testimonial.student?.user?.lastName || ""}`.trim() ||
      "Student";

    const teacherName = testimonial.teacher
      ? `${testimonial.teacher.user?.firstName || ""} ${testimonial.teacher.user?.lastName || ""}`.trim() ||
        "Teacher"
      : null;

    const dto: TestimonialResponseDto = {
      id: testimonial.id,
      studentId: testimonial.studentId,
      studentName,
      teacherId: testimonial.teacherId,
      teacherName,
      courseProgramId: testimonial.courseProgramId,
      courseProgramTitle: testimonial.courseProgram?.title ?? null,
      rating: testimonial.rating,
      comment: testimonial.comment,
      tags: testimonial.tags,
      status: testimonial.status,
      isFeatured: testimonial.isFeatured,
      createdAt: testimonial.createdAt.toISOString(),
    };

    // Include admin data if requested (for admin endpoints)
    if (includeAdminData) {
      dto.adminFeedback = testimonial.adminFeedback;
      dto.reviewedAt = testimonial.reviewedAt?.toISOString() ?? null;
      dto.reviewedByAdminId = testimonial.reviewedByAdminId;
    }

    return dto;
  }
}
