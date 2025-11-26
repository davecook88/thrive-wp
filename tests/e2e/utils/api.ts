import { APIRequestContext, expect } from "@playwright/test";
import { adminEmail, adminPassword } from "./auth";

export interface CourseProgramResponse {
  id: number;
  code: string;
  title: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Helper to create a course program via API
 */
export async function createCourseProgram(
  request: APIRequestContext,
  code: string = "TEST-101",
): Promise<CourseProgramResponse> {
  // 1. Login to get cookies (if not already authenticated in this context)
  // We perform login every time to ensure we have a valid session for this request context
  const loginResponse = await request.post("/api/auth/login", {
    data: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  expect(loginResponse.ok(), "Failed to login via API").toBeTruthy();

  // 2. Create course program
  const response = await request.post("/api/admin/course-programs", {
    data: {
      code,
      title: `Test Course ${code}`,
      description: "Created by E2E test",
      isActive: true,
    },
  });

  // If it already exists (409), try to fetch it to return the ID
  if (response.status() === 409) {
    const fetchResponse = await request.get(`/api/course-programs/${code}`);
    if (fetchResponse.ok()) {
      return (await fetchResponse.json()) as CourseProgramResponse;
    }
  }

  expect(
    response.ok(),
    `Failed to create course program: ${response.statusText()}`,
  ).toBeTruthy();
  return (await response.json()) as CourseProgramResponse;
}

/**
 * Helper to delete a course program via API
 */
export async function deleteCourseProgram(
  request: APIRequestContext,
  id: number,
): Promise<void> {
  // Ensure we are logged in
  const loginResponse = await request.post("/api/auth/login", {
    data: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  expect(loginResponse.ok(), "Failed to login via API").toBeTruthy();

  const response = await request.delete(`/api/admin/course-programs/${id}`);

  // It's okay if it's already gone (404)
  if (response.status() === 404) return;

  expect(
    response.ok(),
    `Failed to delete course program: ${response.statusText()}`,
  ).toBeTruthy();
}

/**
 * Helper to create a test course
 */
export async function createTestCourse(data: {
  code: string;
  title: string;
  description?: string;
  isActive: boolean;
  levelIds: number[];
}): Promise<CourseProgramResponse> {
  const response = await fetch(
    "http://localhost:3000/api/admin/course-programs",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to create test course: ${response.statusText}`);
  }

  return (await response.json()) as CourseProgramResponse;
}

/**
 * Helper to create a test course step
 */
export async function createTestCourseStep(data: {
  courseProgramId: number;
  stepOrder: number;
  label: string;
  title: string;
  description?: string;
  isRequired: boolean;
}): Promise<Record<string, unknown>> {
  const response = await fetch("http://localhost:3000/api/admin/course-steps", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create test course step: ${response.statusText}`,
    );
  }

  return (await response.json()) as Record<string, unknown>;
}
