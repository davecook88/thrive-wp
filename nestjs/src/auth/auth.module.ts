import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { GoogleStrategy } from './strategies/google.strategy.js';
import { AuthService } from './auth.service.js';
import { User } from '../users/entities/user.entity.js';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ session: false }),
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, ConfigService],
  exports: [AuthService],
})
export class AuthModule {}
