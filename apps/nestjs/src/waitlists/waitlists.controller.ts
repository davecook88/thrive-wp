import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  UnauthorizedException,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import type { Request as ExpressRequest } from 'express';
import { WaitlistsService } from './waitlists.service.js';
import { Waitlist } from './entities/waitlist.entity.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { Booking } from '../payments/entities/booking.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  JoinWaitlistSchema,
  type JoinWaitlistDto,
} from './dto/join-waitlist.dto.js';
import {
  NotifyWaitlistSchema,
  type NotifyWaitlistDto,
} from './dto/notify-waitlist.dto.js';
import {
  PromoteWaitlistSchema,
  type PromoteWaitlistDto,
} from './dto/promote-waitlist.dto.js';
import type {
  WaitlistResponseDto,
  WaitlistWithSessionDto,
  WaitlistWithStudentDto,
} from './dto/waitlist-response.dto.js';

@Controller('waitlists')
export class WaitlistsController {
  constructor(
    private readonly waitlistsService: WaitlistsService,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  /**
   * Join waitlist for a session (Student)
   */
  @Post()
  async joinWaitlist(
    @Body(new ZodValidationPipe(JoinWaitlistSchema)) dto: JoinWaitlistDto,
    @Request() req: ExpressRequest,
  ): Promise<WaitlistResponseDto> {
    const userId = req.headers['x-auth-user-id'] as string;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    // Get student ID from user ID
    const student = await this.studentRepository.findOne({
      where: { userId: parseInt(userId, 10) },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const waitlist = await this.waitlistsService.joinWaitlist(
      dto.sessionId,
      student.id,
    );

    return {
      id: waitlist.id,
      sessionId: waitlist.sessionId,
      position: waitlist.position,
      notifiedAt: waitlist.notifiedAt?.toISOString() || null,
      notificationExpiresAt: waitlist.notificationExpiresAt?.toISOString() || null,
      createdAt: waitlist.createdAt.toISOString(),
    };
  }

  /**
   * Get my waitlist entries (Student)
   */
  @Get('me')
  async getMyWaitlists(
    @Request() req: ExpressRequest,
  ): Promise<WaitlistWithSessionDto[]> {
    const userId = req.headers['x-auth-user-id'] as string;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const student = await this.studentRepository.findOne({
      where: { userId: parseInt(userId, 10) },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const waitlists = await this.waitlistsService.getMyWaitlists(student.id);

    return waitlists.map((w) => ({
      id: w.id,
      sessionId: w.sessionId,
      position: w.position,
      notifiedAt: w.notifiedAt?.toISOString() || null,
      notificationExpiresAt: w.notificationExpiresAt?.toISOString() || null,
      createdAt: w.createdAt.toISOString(),
      session: {
        id: w.session.id,
        startAt: w.session.startAt.toISOString(),
        endAt: w.session.endAt.toISOString(),
        type: w.session.type,
        groupClass: w.session.groupClass
          ? {
              id: w.session.groupClass.id,
              title: w.session.groupClass.title,
              levels: w.session.groupClass.groupClassLevels
                ? w.session.groupClass.groupClassLevels.map((gcl) => ({
                    code: gcl.level.code,
                    name: gcl.level.name,
                  }))
                : [],
            }
          : undefined,
      },
    }));
  }

  /**
   * Get waitlist for a specific session (Admin)
   */
  @Get('session/:sessionId')
  @UseGuards(AdminGuard)
  async getWaitlistForSession(
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ): Promise<WaitlistWithStudentDto[]> {
    const waitlists =
      await this.waitlistsService.getWaitlistForSession(sessionId);

    return waitlists.map((w) => ({
      id: w.id,
      sessionId: w.sessionId,
      position: w.position,
      notifiedAt: w.notifiedAt?.toISOString() || null,
      notificationExpiresAt: w.notificationExpiresAt?.toISOString() || null,
      createdAt: w.createdAt.toISOString(),
      student: {
        id: w.student.id,
        userId: w.student.userId,
        name: `${w.student.user.firstName} ${w.student.user.lastName}`,
        email: w.student.user.email,
      },
    }));
  }

  /**
   * Leave waitlist (Student)
   */
  @Delete(':id')
  async leaveWaitlist(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest,
  ): Promise<{ success: boolean }> {
    const userId = req.headers['x-auth-user-id'] as string;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const student = await this.studentRepository.findOne({
      where: { userId: parseInt(userId, 10) },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    await this.waitlistsService.leaveWaitlist(id, student.id);
    return { success: true };
  }

  /**
   * Notify waitlist member of opening (Admin)
   */
  @Post(':id/notify')
  @UseGuards(AdminGuard)
  async notifyWaitlistMember(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(NotifyWaitlistSchema)) dto: NotifyWaitlistDto,
  ): Promise<{ success: boolean }> {
    await this.waitlistsService.notifyWaitlistMember(id, dto.expiresInHours);
    return { success: true };
  }

  /**
   * Promote waitlist member to booking (Admin)
   */
  @Post(':id/promote')
  @UseGuards(AdminGuard)
  async promoteToBooking(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(PromoteWaitlistSchema))
    dto: PromoteWaitlistDto,
  ): Promise<Booking> {
    return this.waitlistsService.promoteToBooking(id, dto.studentPackageId);
  }
}
