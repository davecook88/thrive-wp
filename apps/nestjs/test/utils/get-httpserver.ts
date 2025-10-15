import { INestApplication } from "@nestjs/common";
import { Server } from "http";

export const getHttpServer = (app: INestApplication) => {
  return app.getHttpServer() as Server;
};
