import { Module } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { ZodValidationPipe } from "nestjs-zod";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DatabaseConfig } from "./config/configuration.js";
import configuration from "./config/configuration.js";
import { AuthModule } from "./auth/auth.module.js";
import { UsersModule } from "./users/users.module.js";
import { StudentsModule } from "./students/students.module.js";
import { TeachersModule } from "./teachers/teachers.module.js";
import { PaymentsModule } from "./payments/payments.module.js";
import { SessionsModule } from "./sessions/sessions.module.js";
import { PackagesModule } from "./packages/packages.module.js";
import { PoliciesModule } from "./policies/policies.module.js";
import { BookingsModule } from "./bookings/bookings.module.js";
import { LevelsModule } from "./levels/levels.module.js";
import { GroupClassesModule } from "./group-classes/group-classes.module.js";
import { WaitlistsModule } from "./waitlists/waitlists.module.js";
import { CourseProgramsModule } from "./course-programs/course-programs.module.js";
import { CourseMaterialsModule } from "./course-materials/course-materials.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { TestimonialsModule } from "./testimonials/testimonials.module.js";
import { EventsModule } from "./events/events.module.js";
import { GoogleMeetModule } from "./google-meet/google-meet.module.js";
import { AdminOrdersModule } from "./admin-orders/admin-orders.module.js";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const dbConfig = configService.get<DatabaseConfig>("database");
        if (!dbConfig) {
          throw new Error("Database configuration not found");
        }

        // Import entities directly - this works perfectly with Vitest/SWC!
        // No need for file globs or compiled dist files
        const entityModule = await import("./entities.js");
        const entities = Object.values(entityModule);

        console.log(
          `[AppModule] Loaded ${entities.length} entities directly via import`,
        );

        return {
          type: dbConfig.type,
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          entities: entities,
          // Force disable auto-sync; rely on migrations to avoid FK/index conflicts
          synchronize: false,
          logging: dbConfig.logging,
          timezone: "Z", // Force UTC
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
    WaitlistsModule,
    CourseProgramsModule,
    CourseMaterialsModule,
    NotificationsModule,
    TestimonialsModule,
    EventsModule,
    GoogleMeetModule,
    AdminOrdersModule,
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
