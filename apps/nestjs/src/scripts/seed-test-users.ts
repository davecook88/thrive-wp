import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module.js";
import { AuthService } from "../auth/auth.service.js";
import { UsersService } from "../users/users.service.js";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  // Set dummy env vars for Google Strategy if not present
  if (!process.env.GOOGLE_CLIENT_ID) process.env.GOOGLE_CLIENT_ID = "dummy_id";
  if (!process.env.GOOGLE_CLIENT_SECRET)
    process.env.GOOGLE_CLIENT_SECRET = "dummy_secret";
  if (!process.env.GOOGLE_CALLBACK_URL)
    process.env.GOOGLE_CALLBACK_URL =
      "http://localhost:3000/auth/google/callback";
  if (!process.env.STRIPE_SECRET_KEY)
    process.env.STRIPE_SECRET_KEY = "dummy_stripe_key";

  const app = await NestFactory.createApplicationContext(AppModule);

  const authService = app.get(AuthService);
  const usersService = app.get(UsersService);
  const logger = new Logger("SeedTestUsers");

  const users = [
    {
      email: "student@thrive.com",
      password: "thrive_test_123",
      firstName: "Test",
      lastName: "Student",
      role: "student",
    },
    {
      email: "teacher@thrive.com",
      password: "thrive_test_123",
      firstName: "Test",
      lastName: "Teacher",
      role: "teacher",
    },
    {
      email: "admin@thrive.com",
      password: "thrive_test_123",
      firstName: "Test",
      lastName: "Admin",
      role: "admin",
    },
  ];

  for (const u of users) {
    try {
      let user = await usersService.findByEmail(u.email);
      if (!user) {
        logger.log(`Creating user ${u.email}...`);
        user = await authService.registerLocal(
          u.email,
          u.password,
          u.firstName,
          u.lastName,
        );
      } else {
        logger.log(`User ${u.email} already exists.`);
      }

      if (u.role === "admin") {
        if (!user.admin) {
          logger.log(`Making ${u.email} admin...`);
          await usersService.makeUserAdmin(user.id);
        }
      } else if (u.role === "teacher") {
        if (!user.teacher) {
          logger.log(`Making ${u.email} teacher...`);
          await usersService.makeUserTeacher(user.id);
        }
      }
    } catch (e) {
      logger.error(`Failed to process user ${u.email}`, e);
    }
  }

  await app.close();
}

bootstrap();
