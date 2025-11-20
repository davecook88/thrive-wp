import { NestFactory } from "@nestjs/core";
import { Module, Injectable } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Injectable()
class TestService {
  constructor(private configService: ConfigService) {
    console.log("TestService configService:", !!configService);
  }
}

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [TestService],
})
class TestModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(TestModule);
  await app.close();
}

bootstrap();
