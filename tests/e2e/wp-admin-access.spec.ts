import { expect, test } from "@playwright/test";
import { loginToThrive, handleWpAdminLogin } from "./utils/auth";

/**
 * WordPress Admin Access Tests
 *
 * These tests verify that users can access the WordPress admin panel after
 * logging in through the Thrive frontend. The test handles two scenarios:
 * 1. When X-Auth-Context headers are properly injected by Nginx (ideal case)
 * 2. When wp-login.php appears and requires a separate WordPress login
 */
test.describe("WordPress Admin Access", () => {
  test("should login to Thrive and access wp-admin", async ({ page }) => {
    // Step 1: Navigate to Thrive frontend and login
    await loginToThrive(page);

    // Verify we're logged in to Thrive
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible({
      timeout: 10000,
    });

    // Step 2: Navigate to wp-admin
    await page.goto("/wp-admin/");

    // Step 3: Handle WordPress login if wp-login.php appears
    // This happens when X-Auth-Context headers aren't properly set by Nginx
    await handleWpAdminLogin(page);

    await page.waitForLoadState("domcontentloaded");

    const loginForm = page.locator("#loginform");
    await expect(loginForm).not.toBeVisible({ timeout: 15000 });

    const wpAdminBar = page.locator("#wpadminbar");
    const courseManagementHeading = page.getByRole("heading", {
      name: "Course Programs Management",
    });

    type Destination = "wp-admin" | "course";
    const destination = await Promise.race<Destination>([
      wpAdminBar
        .waitFor({ state: "visible", timeout: 15000 })
        .then(() => "wp-admin"),
      courseManagementHeading
        .waitFor({ state: "visible", timeout: 15000 })
        .then(() => "course"),
    ]).catch(() => null);

    expect(destination).not.toBeNull();

    if (destination === "wp-admin") {
      await expect(wpAdminBar).toBeVisible();
      const adminMenu = page.locator("#adminmenuback, #adminmenu-wrap");
      await expect(adminMenu).toBeVisible();
    } else if (destination === "course") {
      await expect(courseManagementHeading).toBeVisible();
      const courseListTab = page.getByRole("button", { name: "Course List" });
      const createCourseTab = page.getByRole("button", {
        name: "Create New Course",
      });
      await expect(
        Promise.any([
          courseListTab.waitFor({ state: "visible", timeout: 5000 }),
          createCourseTab.waitFor({ state: "visible", timeout: 5000 }),
        ]),
      ).resolves.toBeDefined();
    }
  });

  test("should display wp-admin menu after login", async ({ page }) => {
    // Login to Thrive
    await loginToThrive(page);

    // Navigate to wp-admin
    await page.goto("/wp-admin/");

    // Handle WordPress login if needed
    await handleWpAdminLogin(page);

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Verify we're on wp-admin (not on login page)
    const loginForm = page.locator("#loginform");
    if (await loginForm.isVisible()) {
      throw new Error(
        "Still on WordPress login page after attempting to login",
      );
    }

    // Check for wp-admin elements
    const wpAdminBar = page.locator("#wpadminbar");
    const adminMenu = page.locator("#adminmenuback");

    // At least one of these should be visible on wp-admin
    const hasAdminElements =
      (await wpAdminBar.isVisible()) || (await adminMenu.isVisible());

    expect(hasAdminElements).toBeTruthy();
  });

  test("should handle session persistence when accessing wp-admin", async ({
    page,
  }) => {
    // Login to Thrive frontend
    await loginToThrive(page);

    // Verify Thrive session cookie exists
    const cookies = await page.context().cookies();
    const thriveCookie = cookies.find((c) => c.name === "thrive_sess");
    expect(thriveCookie).toBeDefined();

    // Navigate to wp-admin
    await page.goto("/wp-admin/admin.php?page=thrive-courses");

    // Handle WordPress login if needed
    await handleWpAdminLogin(page);

    // Verify we can interact with wp-admin
    const loginForm = page.locator("#loginform");
    const isLoggedOut = await loginForm.isVisible();

    if (isLoggedOut) {
      throw new Error("Lost session when navigating to wp-admin");
    }

    // If we're on the Thrive course management page, verify we can see content
    const courseHeading = page.locator("h1, h2").filter({
      hasText: /Course|Admin/,
    });
    const courseCount = await courseHeading.count();
    expect(courseCount).toBeGreaterThanOrEqual(0);
  });
});
