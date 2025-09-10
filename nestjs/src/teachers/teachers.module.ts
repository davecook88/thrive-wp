import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeachersController } from './teachers.controller.js';
import { TeachersService } from './teachers.service.js';
import { TeacherAvailabilityService } from './services/teacher-availability.service.js';
import { Teacher } from './entities/teacher.entity.js';
import { TeacherAvailability } from './entities/teacher-availability.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { TeachersPublicController } from './teachers.public.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Teacher, TeacherAvailability]),
    AuthModule, // Import AuthModule to make AuthService available
  ],
  controllers: [TeachersController, TeachersPublicController],
  providers: [TeachersService, TeacherAvailabilityService],
  exports: [TeachersService, TeacherAvailabilityService],
})
export class TeachersModule {}
