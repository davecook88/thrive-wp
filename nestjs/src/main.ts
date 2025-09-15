import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import cookieParser from 'cookie-parser';

// Ensure global crypto (Node 18 should have, but polyfill defensively for libraries expecting it)

if (!(global as any).crypto) {
  const nodeCrypto = require('crypto');
  (global as any).crypto = nodeCrypto.webcrypto || nodeCrypto;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
