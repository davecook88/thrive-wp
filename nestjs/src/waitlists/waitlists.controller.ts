import { Controller, Post, Body, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { WaitlistsService } from './waitlists.service.js';
import { Waitlist } from './entities/waitlist.entity.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { Booking } from '../payments/entities/booking.entity.js';

@Controller('waitlists')
export class WaitlistsController {
  constructor(private readonly waitlistsService: WaitlistsService) {}

  @Post()
  joinWaitlist(
    @Body('sessionId') sessionId: number,
    @Body('studentId') studentId: number,
  ): Promise<Waitlist> {
    return this.waitlistsService.joinWaitlist(sessionId, studentId);
  }

  @Get('session/:sessionId')
  getWaitlistForSession(
    @Param('sessionId') sessionId: string,
  ): Promise<Waitlist[]> {
    return this.waitlistsService.getWaitlistForSession(+sessionId);
  }

  @Delete(':id')
  leaveWaitlist(
    @Param('id') id: string,
    @Body('studentId') studentId: number,
  ): Promise<void> {
    return this.waitlistsService.leaveWaitlist(+id, studentId);
  }

  @Post(':id/notify')
  @UseGuards(AdminGuard)
  notifyWaitlistMember(@Param('id') id: string): Promise<void> {
    return this.waitlistsService.notifyWaitlistMember(+id);
  }

  @Post(':id/promote')
  @UseGuards(AdminGuard)
  promoteToBooking(
    @Param('id') id: string,
    @Body('studentPackageId') studentPackageId?: number,
  ): Promise<Booking> {
    return this.waitlistsService.promoteToBooking(+id, studentPackageId);
  }
}
