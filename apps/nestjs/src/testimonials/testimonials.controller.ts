import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  ParseIntPipe,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { ZodValidationPipe } from "nestjs-zod";
import type {
  CreateTestimonialDto,
  AdminCreateTestimonialDto,
  UpdateTestimonialDto,
  ApproveTestimonialDto,
  RejectTestimonialDto,
  TestimonialResponseDto,
  TestimonialEligibilityDto,
  PaginatedTestimonialsResponse,
} from "@thrive/shared";
import {
  CreateTestimonialSchema,
  AdminCreateTestimonialSchema,
  UpdateTestimonialSchema,
  ApproveTestimonialSchema,
  RejectTestimonialSchema,
} from "@thrive/shared";
import { AdminGuard } from "../auth/admin.guard.js";
import { StudentGuard } from "../auth/student.guard.js";
import { TestimonialsService } from "./testimonials.service.js";
import { UsersService } from "../users/users.service.js";

interface RequestWithUser extends Request {
  user?: {
    id: number;
    email: string;
    roles: string[];
  };
}

/**
 * Public endpoints for testimonials (no authentication required)
 */
@Controller("testimonials")
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  /**
   * Get approved testimonials (public)
   * Supports filtering by teacher, course, rating, featured status
   */
  @Get()
  async getPublicTestimonials(
    @Query("teacherId") teacherId?: string,
    @Query("courseProgramId") courseProgramId?: string,
    @Query("limit") limit?: string,
    @Query("minRating") minRating?: string,
    @Query("isFeatured") isFeatured?: string,
  ): Promise<TestimonialResponseDto[]> {
    const filters: any = {};

    if (teacherId) {
      const id = parseInt(teacherId, 10);
      if (isNaN(id)) {
        throw new BadRequestException("Invalid teacherId");
      }
      filters.teacherId = id;
    }

    if (courseProgramId) {
      const id = parseInt(courseProgramId, 10);
      if (isNaN(id)) {
        throw new BadRequestException("Invalid courseProgramId");
      }
      filters.courseProgramId = id;
    }

    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        throw new BadRequestException("Limit must be between 1 and 100");
      }
      filters.limit = limitNum;
    }

    if (minRating) {
      const rating = parseInt(minRating, 10);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        throw new BadRequestException("minRating must be between 1 and 5");
      }
      filters.minRating = rating;
    }

    if (isFeatured) {
      filters.featuredOnly = isFeatured === "true" || isFeatured === "1";
    }

    return this.testimonialsService.findAllPublic(filters);
  }
}

/**
 * Student endpoints for testimonials (requires student authentication)
 */
@Controller("testimonials/student")
@UseGuards(StudentGuard)
export class StudentTestimonialsController {
  constructor(
    private readonly testimonialsService: TestimonialsService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Submit a new testimonial
   * Student ID is extracted from auth token
   */
  @Post()
  async submitTestimonial(
    @Req() req: RequestWithUser,
    @Body(new ZodValidationPipe(CreateTestimonialSchema))
    dto: CreateTestimonialDto,
  ): Promise<TestimonialResponseDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException("User ID not found in request");
    }

    // Get student ID from user ID
    const user = await this.usersService.findById(userId);
    if (!user?.student) {
      throw new BadRequestException("User is not a student");
    }

    const testimonial = await this.testimonialsService.create(
      user.student.id,
      dto,
    );

    // Return the created testimonial with full details
    const testimonials = await this.testimonialsService.findByStudent(
      user.student.id,
    );
    const created = testimonials.find((t) => t.id === testimonial.id);

    if (!created) {
      throw new Error("Failed to retrieve created testimonial");
    }

    return created;
  }

  /**
   * Check what the student is eligible to review
   */
  @Get("eligibility")
  async checkEligibility(
    @Req() req: RequestWithUser,
  ): Promise<TestimonialEligibilityDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException("User ID not found in request");
    }

    const user = await this.usersService.findById(userId);
    if (!user?.student) {
      throw new BadRequestException("User is not a student");
    }

    return this.testimonialsService.checkEligibility(user.student.id);
  }

  /**
   * Get current student's testimonials
   */
  @Get("my-testimonials")
  async getMyTestimonials(
    @Req() req: RequestWithUser,
  ): Promise<TestimonialResponseDto[]> {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException("User ID not found in request");
    }

    const user = await this.usersService.findById(userId);
    if (!user?.student) {
      throw new BadRequestException("User is not a student");
    }

    return this.testimonialsService.findByStudent(user.student.id);
  }
}

/**
 * Admin endpoints for testimonial management (requires admin authentication)
 */
@Controller("admin/testimonials")
@UseGuards(AdminGuard)
export class AdminTestimonialsController {
  constructor(
    private readonly testimonialsService: TestimonialsService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Get all testimonials with pagination and filters (admin)
   */
  @Get()
  async getAllTestimonials(
    @Query("status") status?: string,
    @Query("teacherId") teacherId?: string,
    @Query("courseProgramId") courseProgramId?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<PaginatedTestimonialsResponse> {
    const filters: any = {};

    if (status) {
      if (!["pending", "approved", "rejected"].includes(status)) {
        throw new BadRequestException("Invalid status value");
      }
      filters.status = status;
    }

    if (teacherId) {
      const id = parseInt(teacherId, 10);
      if (isNaN(id)) {
        throw new BadRequestException("Invalid teacherId");
      }
      filters.teacherId = id;
    }

    if (courseProgramId) {
      const id = parseInt(courseProgramId, 10);
      if (isNaN(id)) {
        throw new BadRequestException("Invalid courseProgramId");
      }
      filters.courseProgramId = id;
    }

    if (page) {
      const pageNum = parseInt(page, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        throw new BadRequestException("Page must be a positive number");
      }
      filters.page = pageNum;
    }

    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        throw new BadRequestException("Limit must be between 1 and 100");
      }
      filters.limit = limitNum;
    }

    return this.testimonialsService.findAllForAdmin(filters);
  }

  /**
   * Create a new testimonial as admin (for importing legacy reviews)
   */
  @Post()
  async createTestimonial(
    @Req() req: RequestWithUser,
    @Body(new ZodValidationPipe(AdminCreateTestimonialSchema))
    dto: AdminCreateTestimonialDto,
  ): Promise<TestimonialResponseDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException("User ID not found in request");
    }

    const user = await this.usersService.findById(userId);
    if (!user?.admin) {
      throw new BadRequestException("User is not an admin");
    }

    const testimonial = await this.testimonialsService.createAsAdmin(
      dto,
      user.admin.id,
    );

    // Return the created testimonial with full details
    const testimonials = await this.testimonialsService.findAllForAdmin({
      page: 1,
      limit: 1,
    });
    const created = testimonials.testimonials.find((t) => t.id === testimonial.id);

    if (!created) {
      throw new Error("Failed to retrieve created testimonial");
    }

    return created;
  }

  /**
   * Approve a testimonial
   */
  @Post(":id/approve")
  async approveTestimonial(
    @Req() req: RequestWithUser,
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(ApproveTestimonialSchema))
    dto: ApproveTestimonialDto,
  ): Promise<{ message: string }> {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException("User ID not found in request");
    }

    const user = await this.usersService.findById(userId);
    if (!user?.admin) {
      throw new BadRequestException("User is not an admin");
    }

    await this.testimonialsService.approve(id, user.admin.id, dto);
    return { message: "Testimonial approved successfully" };
  }

  /**
   * Reject a testimonial
   */
  @Post(":id/reject")
  async rejectTestimonial(
    @Req() req: RequestWithUser,
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(RejectTestimonialSchema))
    dto: RejectTestimonialDto,
  ): Promise<{ message: string }> {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException("User ID not found in request");
    }

    const user = await this.usersService.findById(userId);
    if (!user?.admin) {
      throw new BadRequestException("User is not an admin");
    }

    await this.testimonialsService.reject(id, user.admin.id, dto);
    return { message: "Testimonial rejected successfully" };
  }

  /**
   * Toggle featured status
   */
  @Patch(":id/featured")
  async toggleFeatured(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.testimonialsService.toggleFeatured(id);
    return { message: "Featured status toggled successfully" };
  }

  /**
   * Update a testimonial
   */
  @Put(":id")
  async updateTestimonial(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateTestimonialSchema))
    dto: UpdateTestimonialDto,
  ): Promise<TestimonialResponseDto> {
    const updated = await this.testimonialsService.update(id, dto);
    const testimonials = await this.testimonialsService.findAllForAdmin({
      page: 1,
      limit: 1,
    });
    const found = testimonials.testimonials.find((t) => t.id === updated.id);

    if (!found) {
      throw new Error("Failed to retrieve updated testimonial");
    }

    return found;
  }

  /**
   * Delete a testimonial
   */
  @Delete(":id")
  async deleteTestimonial(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.testimonialsService.delete(id);
    return { message: "Testimonial deleted successfully" };
  }

  /**
   * Get options for creating testimonials (students, teachers, courses)
   */
  @Get("creation-options")
  async getCreationOptions(): Promise<{
    students: Array<{ id: number; name: string; email: string }>;
    teachers: Array<{ id: number; name: string }>;
    courses: Array<{ id: number; title: string }>;
  }> {
    return this.testimonialsService.getCreationOptions();
  }
}
