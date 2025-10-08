import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfig } from './config/configuration.js';
import configuration from './config/configuration.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { StudentsModule } from './students/students.module.js';
import { TeachersModule } from './teachers/teachers.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { PackagesModule } from './packages/packages.module.js';
import { PoliciesModule } from './policies/policies.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { LevelsModule } from './levels/levels.module.js';
import { GroupClassesModule } from './group-classes/group-classes.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get<DatabaseConfig>('database');
        if (!dbConfig) {
          throw new Error('Database configuration not found');
        }
        const moduleDir = dirname(fileURLToPath(import.meta.url));
        return {
          type: dbConfig.type,
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          // Important: do NOT start the glob with '/' or join() will discard moduleDir
          // This pattern works both in ts-node (dev) and compiled dist (prod)
          entities: [join(moduleDir, '**/*.entity{.ts,.js}')],
          // Force disable auto-sync; rely on migrations to avoid FK/index conflicts
          synchronize: false,
          logging: dbConfig.logging,
          timezone: 'Z', // Force UTC
          dateStrings: false,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    StudentsModule,
    TeachersModule,
    PaymentsModule,
    SessionsModule,
    PackagesModule,
    PoliciesModule,
    BookingsModule,
    LevelsModule,
    GroupClassesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
