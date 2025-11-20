import { test, expect } from "@playwright/test";

test.describe("Teacher Availability Access Control", () => {
  const teacherEmail = "teacher@thrive.com";
  const studentEmail = "student@thrive.com";
  const password = "thrive_test_123";

  async function login(page: any, email: string) {
    await page.goto("/");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("dialog", { name: "Sign In" })).toBeVisible();
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.getByRole("button", { name: "Sign in with Email" }).click();
    // Wait for the dialog to disappear
    await expect(
      page.getByRole("dialog", { name: "Sign In" }),
    ).not.toBeVisible();
  }

  async function logout(page: any) {
    // This assumes a 'Sign out' button is available after login.
    // The selector might need to be adjusted based on the actual UI.
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  }

  test.describe("As a Teacher", () => {
    test.beforeEach(async ({ page }) => {
      await login(page, teacherEmail);
    });

    test.afterEach(async ({ page }) => {
      await logout(page);
    });

    test("should be able to access the teacher dashboard and see the availability calendar", async ({
      page,
    }) => {
      await page.goto("/teacher/");
      await expect(
        page.getByRole("heading", { name: "Teacher Dashboard" }),
      ).toBeVisible();
      // Check for the calendar component as a proxy for the availability UI
      await expect(page.locator("thrive-calendar")).toBeVisible();
    });
  });

  test.describe("As a Student", () => {
    test.beforeEach(async ({ page }) => {
      await login(page, studentEmail);
    });

    test.afterEach(async ({ page }) => {
      await logout(page);
    });

    test("should be denied access to the teacher dashboard", async ({
      page,
    }) => {
      await page.goto("/teacher/");
      await expect(
        page.getByText("This section is only available to teachers."),
      ).toBeVisible();
    });
  });

  test.describe("As an Anonymous User", () => {
    test("should be prompted to log in when visiting the teacher dashboard", async ({
      page,
    }) => {
      await page.goto("/teacher/");
      // User stays on the page, but should be prompted to sign in
      await expect(page).toHaveURL("/teacher/");
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    });
  });
});
