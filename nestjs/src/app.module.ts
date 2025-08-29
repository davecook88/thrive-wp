import { Module } from '@nestjs/common';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import configuration, { DatabaseConfig } from './config/configuration.js';
import { UsersModule } from './users/users.module.js';

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
        // In ESM, __dirname isn't defined; derive it from import.meta.url
        const moduleDir = dirname(fileURLToPath(import.meta.url));
        return {
          type: dbConfig.type,
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          entities: [join(moduleDir, '/**/*.entity{.ts,.js}')],
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
