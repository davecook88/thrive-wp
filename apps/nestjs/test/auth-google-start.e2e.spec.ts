import {
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  it,
  expect,
} from "vitest";
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { Server } from "node:http";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { runMigrations } from "./setup.js";

const LOCAL_BOOKING_URL =
  "http://localhost:8080/booking-confirmation/?start=2025-10-08T18:00:00.000Z&end=2025-10-08T19:00:00.000Z&teacher=1&serviceType=PRIVATE";

const ENCODED_QUERY_BOOKING_URL =
  "http://localhost:8080/booking-confirmation/?times=2024-09-02T13%253A30%253A00.000Z";

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

describe("Auth Google Start Redirect (e2e)", () => {
  let app: INestApplication;
  let originalBaseUrl: string | undefined;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    await runMigrations(); // Ensure migrations have run

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    originalBaseUrl = process.env.WP_BASE_URL;
    process.env.WP_BASE_URL = "http://localhost:8080";
  });

  afterEach(() => {
    if (originalBaseUrl === undefined) {
      delete process.env.WP_BASE_URL;
    } else {
      process.env.WP_BASE_URL = originalBaseUrl;
    }
  });

  it("stores same-origin redirect path when provided as absolute URL", async () => {
    const server = app.getHttpServer() as unknown as Server;
    const response = await request(server)
      .get("/auth/google/start")
      .query({ redirect: LOCAL_BOOKING_URL })
      .expect(302);

    expect(response.headers.location).toBe("/auth/google");

    const cookies = toArray(response.headers["set-cookie"]);
    const redirectCookie = cookies.find((cookie) =>
      cookie.startsWith("post_auth_redirect="),
    );

    expect(redirectCookie).toBeDefined();

    const cookieValue = decodeURIComponent(
      redirectCookie!.split(";")[0].split("=")[1],
    );

    expect(cookieValue).toBe(
      "/booking-confirmation/?start=2025-10-08T18:00:00.000Z&end=2025-10-08T19:00:00.000Z&teacher=1&serviceType=PRIVATE",
    );
  });

  it("preserves already-encoded query values without normalizing them", async () => {
    const server = app.getHttpServer() as unknown as Server;
    const response = await request(server)
      .get("/auth/google/start")
      .query({ redirect: ENCODED_QUERY_BOOKING_URL })
      .expect(302);

    expect(response.headers.location).toBe("/auth/google");

    const cookies = toArray(response.headers["set-cookie"]);
    const redirectCookie = cookies.find((cookie) =>
      cookie.startsWith("post_auth_redirect="),
    );

    expect(redirectCookie).toBeDefined();

    const cookieValue = decodeURIComponent(
      redirectCookie!.split(";")[0].split("=")[1],
    );

    expect(cookieValue).toBe(
      "/booking-confirmation/?times=2024-09-02T13%253A30%253A00.000Z",
    );
  });

  it("ignores redirects for other origins", async () => {
    const server = app.getHttpServer() as unknown as Server;
    const response = await request(server)
      .get("/auth/google/start")
      .query({ redirect: "https://malicious.example/steal" })
      .expect(302);

    expect(response.headers.location).toBe("/auth/google");

    const cookies = toArray(response.headers["set-cookie"]);
    const redirectCookie = cookies.find((cookie) =>
      cookie.startsWith("post_auth_redirect="),
    );

    expect(redirectCookie).toBeUndefined();
  });
});
