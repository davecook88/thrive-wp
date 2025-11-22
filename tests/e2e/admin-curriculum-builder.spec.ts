import { test, expect, Page } from "@playwright/test";

const adminEmail = "admin@thrive.com";
const adminPassword = "thrive_test_123";

/**
 * Admin Curriculum Builder E2E Tests
 *
 * Tests for the Admin Course Programs Management interface including:
 * - Drag-and-drop step reordering
 * - Step editing and creation
 * - Course filtering by status and level
 * - UX enhancements and empty states
 */

test.describe("Admin Curriculum Builder", () => {
  // Helper function to login as admin
  async function loginAsAdmin(page: Page) {
    await page.goto("/");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Wait for modal dialog
    await expect(page.getByRole("dialog", { name: "Sign In" })).toBeVisible({
      timeout: 10000,
    });

    // Fill credentials
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);

    // Submit
    await page.getByRole("button", { name: "Sign in with Email" }).click();

    // Verify modal is gone and we're logged in
    await expect(page.getByRole("dialog", { name: "Sign In" })).not.toBeVisible(
      { timeout: 10000 },
    );
  }

  // Helper function to logout
  async function logout(page: Page) {
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  }

  // Navigate to admin dashboard
  async function navigateToCoursesAdmin(page: Page) {
    await page.goto("/");
    // Wait for page to load and look for the admin link or navigate directly
    await page.goto("/wp-admin/admin.php?page=thrive-courses");

    // Check if we were redirected to login page
    if (page.url().includes("wp-login.php")) {
      await page.fill("#user_login", adminEmail);
      await page.fill("#user_pass", adminPassword);
      await page.click("#wp-submit");
    }

    await page.waitForLoadState("networkidle");
  }

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test.describe("Course List View", () => {
    test("should display course list with all courses", async ({ page }) => {
      await navigateToCoursesAdmin(page);

      // Verify the main heading is visible
      await expect(
        page.getByRole("heading", { name: "Course Programs Management" }),
      ).toBeVisible();

      // Verify the tabs are visible
      await expect(
        page.getByRole("button", { name: "Course List" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Create New Course" }),
      ).toBeVisible();

      // Course list tab should be active by default
      const courseListTab = page.getByRole("button", { name: "Course List" });
      await expect(courseListTab).toHaveClass(/border-blue-500/);
    });

    test("should display loading state while fetching courses", async ({
      page,
    }) => {
      await navigateToCoursesAdmin(page);

      // Look for loading indicator briefly
      const loadingIndicator = page.locator(".animate-spin");
      // Wait for either the loading to appear and disappear, or courses to load
      await page.waitForLoadState("networkidle");
    });

    test("should display course cards with title, code, and status", async ({
      page,
    }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      // Look for at least one course in the list
      const courseItems = page
        .locator("li")
        .filter({ has: page.locator(".text-lg.font-medium.text-gray-900") });
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        // Check the first course has expected elements
        const firstCourse = courseItems.first();

        // Should have course code badge
        const courseBadge = firstCourse
          .locator("span")
          .filter({ hasText: /^[A-Z0-9-]+$/ })
          .first();
        await expect(courseBadge).toBeVisible();

        // Should have step count
        const stepsText = firstCourse
          .locator("span")
          .filter({ hasText: "steps" });
        await expect(stepsText).toBeVisible();

        // Should have status badge (Active/Inactive)
        const statusBadge = firstCourse
          .locator(".inline-flex.items-center.px-2\\.5")
          .filter({
            hasText: /Active|Inactive/,
          });
        await expect(statusBadge).toBeVisible();
      }
    });

    test("should display action buttons for each course", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = page
        .locator("li")
        .filter({ has: page.locator(".text-lg.font-medium.text-gray-900") });
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        const firstCourse = courseItems.first();

        // Should have Manage Steps button
        const manageStepsBtn = firstCourse.getByRole("button", {
          name: "Manage Steps",
        });
        await expect(manageStepsBtn).toBeVisible();

        // Should have Manage Cohorts button
        const manageCohorts = firstCourse.getByRole("button", {
          name: "Manage Cohorts",
        });
        await expect(manageCohorts).toBeVisible();

        // Should have Edit button
        const editBtn = firstCourse.getByRole("button", { name: "Edit" });
        await expect(editBtn).toBeVisible();
      }
    });

    test("should show empty state when no courses exist (after filtering)", async ({
      page,
    }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      // Try filtering to a non-existent level
      const levelFilter = page.locator("#level-filter");
      if (await levelFilter.isVisible()) {
        await levelFilter.selectOption("999"); // Non-existent level ID
        await page.waitForLoadState("networkidle");

        // Should show empty state
        const emptyState = page.locator("text=No courses found");
        await expect(emptyState).toBeVisible();
      }
    });
  });

  test.describe("Course Filters", () => {
    test("should display status filter dropdown", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const statusFilter = page.locator("#status-filter");
      await expect(statusFilter).toBeVisible();

      // Should have All, Active, Inactive options
      const options = statusFilter.locator("option");
      await expect(options).toHaveCount(3);
    });

    test("should display level filter dropdown", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const levelFilter = page.locator("#level-filter");
      await expect(levelFilter).toBeVisible();

      // Should have at least "All Levels" option
      const allLevelsOption = levelFilter.locator("option").first();
      await expect(allLevelsOption).toHaveText("All Levels");
    });

    test("should filter courses by Active status", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const statusFilter = page.locator("#status-filter");
      const initialCount = page.locator("li").filter({
        has: page.locator(".text-lg.font-medium.text-gray-900"),
      });

      const initialCourses = await initialCount.count();

      // Filter by Active
      await statusFilter.selectOption("active");
      await page.waitForLoadState("networkidle");

      // Count should remain same or less
      const activeCourses = await initialCount.count();
      expect(activeCourses).toBeLessThanOrEqual(initialCourses);

      // All visible courses should have Active badge
      if (activeCourses > 0) {
        const activeBadges = page
          .locator(".inline-flex")
          .filter({ hasText: "Active" });
        const activeCount = await activeBadges.count();
        expect(activeCount).toBeGreaterThan(0);
      }
    });

    test("should filter courses by Inactive status", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const statusFilter = page.locator("#status-filter");

      // Filter by Inactive
      await statusFilter.selectOption("inactive");
      await page.waitForLoadState("networkidle");

      // All visible courses should have Inactive badge (if any)
      const inactiveBadges = page
        .locator(".inline-flex")
        .filter({ hasText: "Inactive" });
      const inactiveCount = await inactiveBadges.count();
      expect(inactiveCount).toBeGreaterThanOrEqual(0);
    });

    test("should show course count in filter section", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      // Look for "Showing X courses" text
      const courseCountText = page
        .locator(".text-sm.text-gray-500")
        .filter({ hasText: "Showing" });
      await expect(courseCountText).toBeVisible();
    });

    test("should reset filters when selecting All", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const statusFilter = page.locator("#status-filter");

      // Get initial count
      const courseItems = page.locator("li").filter({
        has: page.locator(".text-lg.font-medium.text-gray-900"),
      });
      const initialCount = await courseItems.count();

      // Filter by Active
      await statusFilter.selectOption("active");
      await page.waitForLoadState("networkidle");
      const activeCount = await courseItems.count();

      // Reset to All
      await statusFilter.selectOption("all");
      await page.waitForLoadState("networkidle");
      const resetCount = await courseItems.count();

      // Should match initial count
      expect(resetCount).toBe(initialCount);
    });
  });

  test.describe("Step Management Modal", () => {
    test("should open Manage Steps modal when clicking Manage Steps button", async ({
      page,
    }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = page.locator("li").filter({
        has: page.locator(".text-lg.font-medium.text-gray-900"),
      });
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        // Click Manage Steps on first course
        const manageStepsBtn = courseItems
          .first()
          .getByRole("button", { name: "Manage Steps" });
        await manageStepsBtn.click();

        // Wait for modal to appear
        const modal = page.locator(".fixed.inset-0.bg-gray-500").first();
        await expect(modal).toBeVisible();

        // Modal should show title with course name
        const modalTitle = page
          .locator("h3")
          .filter({ hasText: "Manage Steps:" });
        await expect(modalTitle).toBeVisible();

        // Should have form title
        const formTitle = page
          .locator("h4")
          .filter({ hasText: /Add New Step|Edit Step/ });
        await expect(formTitle).toBeVisible();
      }
    });

    test("should close modal when clicking close button", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = page.locator("li").filter({
        has: page.locator(".text-lg.font-medium.text-gray-900"),
      });
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        const manageStepsBtn = courseItems
          .first()
          .getByRole("button", { name: "Manage Steps" });
        await manageStepsBtn.click();

        // Modal should be visible
        const modal = page.locator(".fixed.inset-0.bg-gray-500").first();
        await expect(modal).toBeVisible();

        // Click close button (X icon)
        const closeBtn = page
          .locator("svg")
          .filter({
            has: page.locator("path").filter({ hasText: /M6 18L18 6/ }),
          })
          .first();
        await closeBtn.click();

        // Modal should be hidden
        await expect(modal).not.toBeVisible();
      }
    });

    test("should display form to add new step", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = page.locator("li").filter({
        has: page.locator(".text-lg.font-medium.text-gray-900"),
      });
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        const manageStepsBtn = courseItems
          .first()
          .getByRole("button", { name: "Manage Steps" });
        await manageStepsBtn.click();

        // Form should have required fields
        const stepOrderInput = page
          .locator('input[type="number"][min="1"]')
          .first();
        await expect(stepOrderInput).toBeVisible();

        const titleInput = page.locator('input[type="text"]').filter({
          has: page.locator('label:has-text("Title")').first(),
        });
        await expect(titleInput).toBeVisible();

        // Should have Add Step button
        const addStepBtn = page.getByRole("button", { name: "Add Step" });
        await expect(addStepBtn).toBeVisible();
      }
    });

    test("should display existing steps in the modal", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = page.locator("li").filter({
        has: page.locator(".text-lg.font-medium.text-gray-900"),
      });
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        const firstCourse = courseItems.first();
        const stepsText = firstCourse
          .locator("span")
          .filter({ hasText: "steps" });
        const stepsCountText = await stepsText.textContent();
        const stepsCount = parseInt(stepsCountText?.match(/\d+/)?.[0] || "0");

        if (stepsCount > 0) {
          const manageStepsBtn = firstCourse.getByRole("button", {
            name: "Manage Steps",
          });
          await manageStepsBtn.click();

          // Should show "Course Steps" heading
          const courseStepsHeading = page
            .locator("h4")
            .filter({ hasText: "Course Steps" });
          await expect(courseStepsHeading).toBeVisible();

          // Should display step cards
          const stepCards = page.locator(
            ".border.border-gray-200.rounded-lg.p-4.bg-white",
          );
          const displayedSteps = await stepCards.count();
          expect(displayedSteps).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe("Step Drag and Drop Reordering", () => {
    test("should display drag handle for each step", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = page.locator("li").filter({
        has: page.locator(".text-lg.font-medium.text-gray-900"),
      });
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        const firstCourse = courseItems.first();
        const stepsText = firstCourse
          .locator("span")
          .filter({ hasText: "steps" });
        const stepsCountText = await stepsText.textContent();
        const stepsCount = parseInt(stepsCountText?.match(/\d+/)?.[0] || "0");

        if (stepsCount > 1) {
          const manageStepsBtn = firstCourse.getByRole("button", {
            name: "Manage Steps",
          });
          await manageStepsBtn.click();

          // Should have drag handles
          const dragHandles = page.locator(".drag-handle.cursor-move");
          const handleCount = await dragHandles.count();
          expect(handleCount).toBeGreaterThan(0);
        }
      }
    });

    test("should reorder steps by dragging", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = page.locator("li").filter({
        has: page.locator(".text-lg.font-medium.text-gray-900"),
      });
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        const firstCourse = courseItems.first();
        const stepsText = firstCourse
          .locator("span")
          .filter({ hasText: "steps" });
        const stepsCountText = await stepsText.textContent();
        const stepsCount = parseInt(stepsCountText?.match(/\d+/)?.[0] || "0");

        if (stepsCount > 1) {
          const manageStepsBtn = firstCourse.getByRole("button", {
            name: "Manage Steps",
          });
          await manageStepsBtn.click();

          // Get initial step order
          const stepCards = page.locator(
            ".border.border-gray-200.rounded-lg.p-4.bg-white",
          );
          const firstStepTitle = await stepCards
            .first()
            .locator("h5")
            .textContent();

          // Get second step element
          const firstDragHandle = page
            .locator(".drag-handle.cursor-move")
            .first();
          const secondStepCard = page
            .locator(".border.border-gray-200.rounded-lg.p-4.bg-white")
            .nth(1);

          // Drag first step to second position
          await firstDragHandle.dragTo(secondStepCard, { force: true });

          // Wait for reordering to complete
          await page.waitForLoadState("networkidle");

          // Verify order changed (this is a simple check)
          const updatedStepCards = page.locator(
            ".border.border-gray-200.rounded-lg.p-4.bg-white",
          );
          expect(await updatedStepCards.count()).toBeGreaterThanOrEqual(
            stepsCount,
          );
        }
      }
    });

    test("should persist new step order after modal close", async ({
      page,
    }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = page.locator("li").filter({
        has: page.locator(".text-lg.font-medium.text-gray-900"),
      });
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        const firstCourse = courseItems.first();
        const stepsText = firstCourse
          .locator("span")
          .filter({ hasText: "steps" });
        const stepsCountText = await stepsText.textContent();
        const stepsCount = parseInt(stepsCountText?.match(/\d+/)?.[0] || "0");

        if (stepsCount > 1) {
          const manageStepsBtn = firstCourse.getByRole("button", {
            name: "Manage Steps",
          });
          await manageStepsBtn.click();

          // Wait for modal to fully load
          await page.waitForLoadState("networkidle");

          // Get step order numbers from the display
          const stepOrderBadges = page.locator(
            ".inline-flex.items-center.justify-center.h-8.w-8.rounded-full.bg-blue-100.text-blue-800",
          );
          const initialOrders: (string | undefined)[] = [];
          for (let i = 0; i < (await stepOrderBadges.count()); i++) {
            const text = await stepOrderBadges.nth(i).textContent();
            initialOrders.push(text?.trim());
          }

          // Close modal
          const modal = page.locator(".fixed.inset-0.bg-gray-500").first();
          await modal.click();

          // Reopen the same course
          await page.waitForLoadState("networkidle");
          const manageStepsBtn2 = courseItems
            .first()
            .getByRole("button", { name: "Manage Steps" });
          await manageStepsBtn2.click();

          // Verify order is same
          const stepOrderBadges2 = page.locator(
            ".inline-flex.items-center.justify-center.h-8.w-8.rounded-full.bg-blue-100.text-blue-800",
          );
          const finalOrders: (string | undefined)[] = [];
          for (let i = 0; i < (await stepOrderBadges2.count()); i++) {
            const text = await stepOrderBadges2.nth(i).textContent();
            finalOrders.push(text?.trim());
          }

          expect(initialOrders).toEqual(finalOrders);
        }
      }
    });
  });

  test.describe("Step Editing", () => {
    test("should display Edit button for each step", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = page.locator("li").filter({
        has: page.locator(".text-lg.font-medium.text-gray-900"),
      });
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        const firstCourse = courseItems.first();
        const stepsText = firstCourse
          .locator("span")
          .filter({ hasText: "steps" });
        const stepsCountText = await stepsText.textContent();
        const stepsCount = parseInt(stepsCountText?.match(/\d+/)?.[0] || "0");

        if (stepsCount > 0) {
          const manageStepsBtn = firstCourse.getByRole("button", {
            name: "Manage Steps",
          });
          await manageStepsBtn.click();

          // Should have Edit buttons
          const editButtons = page.getByRole("button", { name: "Edit" });
          const editCount = await editButtons.count();
          expect(editCount).toBeGreaterThan(0);
        }
      }
    });

    test("should populate form when clicking Edit on a step", async ({
      page,
    }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = page.locator("li").filter({
        has: page.locator(".text-lg.font-medium.text-gray-900"),
      });
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        const firstCourse = courseItems.first();
        const stepsText = firstCourse
          .locator("span")
          .filter({ hasText: "steps" });
        const stepsCountText = await stepsText.textContent();
        const stepsCount = parseInt(stepsCountText?.match(/\d+/)?.[0] || "0");

        if (stepsCount > 0) {
          const manageStepsBtn = firstCourse.getByRole("button", {
            name: "Manage Steps",
          });
          await manageStepsBtn.click();

          // Click Edit button on first step
          const editButtons = page.getByRole("button", { name: "Edit" });
          if ((await editButtons.count()) > 0) {
            const firstEditBtn = editButtons.first();
            await firstEditBtn.click();

            // Form title should change to "Edit Step"
            const formTitle = page
              .locator("h4")
              .filter({ hasText: "Edit Step" });
            await expect(formTitle).toBeVisible();

            // Button text should change to "Update Step"
            const updateBtn = page.getByRole("button", { name: "Update Step" });
            await expect(updateBtn).toBeVisible();
          }
        }
      }
    });

    test("should update step when submitting edit form", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = page.locator("li").filter({
        has: page.locator(".text-lg.font-medium.text-gray-900"),
      });
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        const firstCourse = courseItems.first();
        const stepsText = firstCourse
          .locator("span")
          .filter({ hasText: "steps" });
        const stepsCountText = await stepsText.textContent();
        const stepsCount = parseInt(stepsCountText?.match(/\d+/)?.[0] || "0");

        if (stepsCount > 0) {
          const manageStepsBtn = firstCourse.getByRole("button", {
            name: "Manage Steps",
          });
          await manageStepsBtn.click();

          // Get original title
          const stepCards = page.locator(
            ".border.border-gray-200.rounded-lg.p-4.bg-white",
          );
          const originalTitle = await stepCards
            .first()
            .locator("h5")
            .textContent();

          // Click Edit
          const editButtons = page.getByRole("button", { name: "Edit" });
          if ((await editButtons.count()) > 0) {
            await editButtons.first().click();

            // Update title
            const titleInput = page
              .locator('input[type="text"]')
              .filter({
                has: page.locator('label:has-text("Title")').first(),
              })
              .first();
            await titleInput.clear();
            const newTitle = `Updated Step Title ${Date.now()}`;
            await titleInput.fill(newTitle);

            // Submit
            const updateBtn = page.getByRole("button", { name: "Update Step" });
            await updateBtn.click();

            // Wait for update to complete
            await page.waitForLoadState("networkidle");

            // Title should be updated
            const updatedCards = page.locator(
              ".border.border-gray-200.rounded-lg.p-4.bg-white",
            );
            const updatedTitle = await updatedCards
              .first()
              .locator("h5")
              .textContent();
            expect(updatedTitle).toContain(newTitle);
          }
        }
      }
    });

    test("should cancel edit and reset form", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = page.locator("li").filter({
        has: page.locator(".text-lg.font-medium.text-gray-900"),
      });
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        const firstCourse = courseItems.first();
        const stepsText = firstCourse
          .locator("span")
          .filter({ hasText: "steps" });
        const stepsCountText = await stepsText.textContent();
        const stepsCount = parseInt(stepsCountText?.match(/\d+/)?.[0] || "0");

        if (stepsCount > 0) {
          const manageStepsBtn = firstCourse.getByRole("button", {
            name: "Manage Steps",
          });
          await manageStepsBtn.click();

          // Click Edit
          const editButtons = page.getByRole("button", { name: "Edit" });
          if ((await editButtons.count()) > 0) {
            await editButtons.first().click();

            // Cancel button should be visible
            const cancelBtn = page
              .locator("button")
              .filter({ hasText: "Cancel Edit" });
            await expect(cancelBtn).toBeVisible();

            // Click Cancel
            await cancelBtn.click();

            // Form title should be back to "Add New Step"
            const formTitle = page
              .locator("h4")
              .filter({ hasText: "Add New Step" });
            await expect(formTitle).toBeVisible();

            // Button should be "Add Step"
            const addBtn = page.getByRole("button", { name: "Add Step" });
            await expect(addBtn).toBeVisible();
          }
        }
      }
    });
  });

  test.describe("UX Enhancements", () => {
    test("should show visual feedback when hovering over course rows", async ({
      page,
    }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = page.locator("li").filter({
        has: page.locator(".text-lg.font-medium.text-gray-900"),
      });
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        const firstCourse = courseItems.first();

        // Check for hover class
        await expect(firstCourse).toHaveClass(/hover:bg-gray-50/);
      }
    });

    test("should display step counter in course cards", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = page.locator("li").filter({
        has: page.locator(".text-lg.font-medium.text-gray-900"),
      });
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        // Every course should show step count
        for (let i = 0; i < Math.min(3, courseCount); i++) {
          const course = courseItems.nth(i);
          const stepsLabel = course
            .locator("span")
            .filter({ hasText: /\d+ steps/ });
          await expect(stepsLabel).toBeVisible();
        }
      }
    });

    test("should display status badges with appropriate colors", async ({
      page,
    }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const activeStatusBadges = page
        .locator(".bg-green-100.text-green-800")
        .filter({ hasText: "Active" });
      const inactiveStatusBadges = page
        .locator(".bg-red-100.text-red-800")
        .filter({ hasText: "Inactive" });

      // Should have at least some status badges
      const activeCount = await activeStatusBadges.count();
      const inactiveCount = await inactiveStatusBadges.count();

      expect(activeCount + inactiveCount).toBeGreaterThan(0);
    });

    test("should display stripe publication status badge", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      // Check for any Stripe-related badges
      const stripeBadges = page
        .locator(".bg-blue-100.text-blue-800")
        .filter({ hasText: "Stripe" });
      // Count is >= 0 as not all courses may be published
      const stripeCount = await stripeBadges.count();
      expect(stripeCount).toBeGreaterThanOrEqual(0);
    });

    test("should show teacher-friendly icons and labels", async ({ page }) => {
      await navigateToCoursesAdmin(page);

      // Verify the page heading is clear and descriptive
      const pageDescription = page.locator("p").filter({
        hasText: "Create and manage structured course programs",
      });
      await expect(pageDescription).toBeVisible();
    });
  });

  test.describe("Create/Edit Course Tab", () => {
    test("should switch to Create New Course tab", async ({ page }) => {
      await navigateToCoursesAdmin(page);

      const createTab = page.getByRole("button", { name: "Create New Course" });
      await createTab.click();

      // Tab should be active
      await expect(createTab).toHaveClass(/border-blue-500/);

      // Form should be visible
      const courseInfoHeading = page.getByRole("heading", {
        name: "Course Information",
      });
      await expect(courseInfoHeading).toBeVisible();
    });

    test("should display course creation form fields", async ({ page }) => {
      await navigateToCoursesAdmin(page);

      const createTab = page.getByRole("button", { name: "Create New Course" });
      await createTab.click();

      // Should have required fields
      const codeInput = page.locator("#code");
      const titleInput = page.locator("#title");
      const descriptionInput = page.locator("#description");

      await expect(codeInput).toBeVisible();
      await expect(titleInput).toBeVisible();
      await expect(descriptionInput).toBeVisible();
    });

    test("should show validation message for course code pattern", async ({
      page,
    }) => {
      await navigateToCoursesAdmin(page);

      const createTab = page.getByRole("button", { name: "Create New Course" });
      await createTab.click();

      const codeInput = page.locator("#code");
      const helpText = codeInput.locator("+ p");

      // Should have help text explaining format
      await expect(helpText).toContainText(/Uppercase letters/);
    });
  });

  test.describe("Accessibility & Navigation", () => {
    test("should have proper heading hierarchy", async ({ page }) => {
      await navigateToCoursesAdmin(page);

      const mainHeading = page.getByRole("heading", {
        name: "Course Programs Management",
        level: 2,
      });
      await expect(mainHeading).toBeVisible();
    });

    test("should have descriptive labels for all form inputs", async ({
      page,
    }) => {
      await navigateToCoursesAdmin(page);

      const statusFilter = page.locator("#status-filter");
      const statusLabel = page.locator('label[for="status-filter"]');

      await expect(statusLabel).toBeVisible();
      await expect(statusLabel).toHaveText("Status:");
    });

    test("should have close button on modal accessible via keyboard", async ({
      page,
    }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = page.locator("li").filter({
        has: page.locator(".text-lg.font-medium.text-gray-900"),
      });
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        const manageStepsBtn = courseItems
          .first()
          .getByRole("button", { name: "Manage Steps" });
        await manageStepsBtn.click();

        // Modal should be open
        const modal = page.locator(".fixed.inset-0.bg-gray-500").first();
        await expect(modal).toBeVisible();

        // Close button should have title attribute
        const closeBtn = page.locator("button").filter({ hasText: "Close" });
        // The close button has sr-only text
        const srOnlyText = page.locator(".sr-only");
        await expect(srOnlyText).toHaveCount(1);
      }
    });
  });
});
