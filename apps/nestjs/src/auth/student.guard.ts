import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { AuthService } from "./auth.service.js";
import jwt from "jsonwebtoken";

interface SessionPayload {
  sub: string;
  email: string;
  roles: string[];
}

interface RequestWithUser extends Request {
  user?: {
    id: number;
    email: string;
    roles: string[];
  };
}

@Injectable()
export class StudentGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const cookieName = process.env.SESSION_COOKIE_NAME || "thrive_sess";

    // Extract token from cookie
    const token: string | null =
      (request.cookies as Record<string, string> | undefined)?.[cookieName] ||
      this.extractCookie(request.headers.cookie || "", cookieName);

    if (!token) {
      throw new UnauthorizedException("No authentication token provided");
    }

    // Verify JWT token
    const payload = this.verifySession(token);
    console.log("StudentGuard payload:", payload);
    if (!payload) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    // Check if user has student role
    if (!payload.roles.includes("student")) {
      throw new UnauthorizedException("Student access required");
    }

    // Attach user info to request for use in controllers
    request.user = {
      id: parseInt(payload.sub, 10),
      email: payload.email,
      roles: payload.roles,
    };

    return true;
  }

  private extractCookie(
    cookieHeader: string,
    cookieName: string,
  ): string | null {
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").map((c) => c.trim());
    for (const cookie of cookies) {
      const [name, ...valueParts] = cookie.split("=");
      if (name === cookieName) {
        return valueParts.join("=");
      }
    }
    return null;
  }

  private verifySession(token: string): SessionPayload | null {
    try {
      const secret =
        process.env.SESSION_SECRET || "dev_insecure_secret_change_me";
      return jwt.verify(token, secret, {
        algorithms: ["HS256"],
      }) as SessionPayload;
    } catch {
      return null;
    }
  }
}
