import { expect, test } from "@playwright/test";
import { loginAsAdmin, loginToThrive } from "./utils/auth";
import {
  createCourseProgram,
  deleteCourseProgram,
  type CourseProgramResponse,
} from "./utils/api";

test.describe("Admin Course Materials", () => {
  let courseProgramId: number;
  let courseCode: string;

  test.beforeEach(async ({ page, request }) => {
    courseCode = `E2E-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create course program via API
    const course: CourseProgramResponse = await createCourseProgram(
      request,
      courseCode,
    );
    courseProgramId = course.id;

    // Login to NestJS to ensure we have the session cookie for API calls
    await loginToThrive(page);

    // Login to WordPress Admin
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    if (courseProgramId) {
      await deleteCourseProgram(request, courseProgramId);
    }
  });

  test("should navigate to course materials page and show program dropdown", async ({
    page,
  }) => {
    // Navigate to the Course Materials page
    await page.goto("/wp-admin/admin.php?page=thrive-course-materials");

    // Verify the page title or heading
    await expect(page.locator("h1")).toContainText("Course Materials");

    // Check if the Course Program dropdown exists and is populated
    const programSelect = page.locator("select#course-select"); // Adjust selector as needed
    await expect(programSelect).toBeVisible();

    // Verify that the created course is in the dropdown
    await expect(programSelect).toContainText(`Test Course ${courseCode}`);

    const options = programSelect.locator("option");
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
  });

  test("should allow selecting a course program", async ({ page }) => {
    await page.goto("/wp-admin/admin.php?page=thrive-course-materials");

    const programSelect = page.locator("select#course-select"); // Adjust selector as needed

    // Select the created course
    await programSelect.selectOption({ label: `Test Course ${courseCode}` });

    // Verify that the selection was successful
    const value = await programSelect.inputValue();
    // The value might be the ID or code depending on implementation, but we selected by label
    expect(value).toBeTruthy();
  });
});
