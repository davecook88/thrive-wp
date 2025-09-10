import { Module } from '@nestjs/common';
import { SessionsService } from './services/sessions.service.js';
import { TeachersModule } from '../teachers/teachers.module.js';

@Module({
  imports: [TeachersModule],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
