import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import cookieParser from "cookie-parser";
import { webcrypto } from "crypto";

// Ensure global crypto (Node 18 should have, but polyfill defensively for libraries expecting it)

if (!(globalThis as unknown as { crypto?: unknown }).crypto) {
  (globalThis as unknown as { crypto: typeof webcrypto }).crypto = webcrypto;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
