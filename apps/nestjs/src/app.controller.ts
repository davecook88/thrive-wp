import { Controller, Get, Post, Body, Headers } from "@nestjs/common";
import { AppService } from "./app.service.js";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post("test-bridge")
  testBridge(
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string>,
  ): { message: string } {
    console.log("Received request on /test-bridge");
    console.log("Headers:", headers);
    console.log("Body:", body);
    return { message: "Request received by NestJS!123" };
  }
}
