import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { RequestWithUser } from "./authenticated.guard.js";

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
