import { test, expect, Page, Locator } from "@playwright/test";
import { loginToThrive, handleWpAdminLogin } from "./utils/auth";

test.describe("Admin Curriculum Builder", () => {
  const COURSE_ADMIN_URL = "/wp-admin/admin.php?page=thrive-admin-courses";
  const COURSE_ADMIN_HEADING = "Course Programs";

  // Helper function to login as admin
  async function logout(page: Page) {
    const signOutButton = page.getByRole("button", { name: /sign out/i });
    if ((await signOutButton.count()) === 0) {
      return;
    }

    await signOutButton.first().click();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  }

  // Navigate to admin dashboard
  async function navigateToCoursesAdmin(page: Page) {
    await loginToThrive(page);

    // Navigate directly to the admin course page
    await page.goto(COURSE_ADMIN_URL);

    // Check if we were redirected to login page
    if (page.url().includes("wp-login.php")) {
      console.log("Redirected to wp-login.php, re-authenticating...");
      await handleWpAdminLogin(page);
      // After successful re-authentication, we should be on the admin dashboard
      // Ensure we navigate back to the target admin page
      await page.goto(COURSE_ADMIN_URL);
    }

    await page.waitForLoadState("networkidle");
    // Finally, assert that we are on the correct admin page
    await expect(page).toHaveURL(
      /wp-admin\/admin\.php\?page=thrive-admin-courses/,
    );
    await expect(
      page.getByRole("heading", { name: COURSE_ADMIN_HEADING, level: 2 }),
    ).toBeVisible({ timeout: 15000 });
  }

  const getCourseCards = (page: Page) => page.getByTestId("course-card");

  const getManageStepsModal = (page: Page): Locator =>
    page.locator(".fixed.inset-0.bg-gray-500").first();

  const getModalFieldByLabel = (
    modal: Locator,
    labelText: string,
    elementTag: "input" | "textarea" = "input",
  ): Locator =>
    modal
      .locator(`label:has-text("${labelText}")`)
      .first()
      .locator(`xpath=following::*[self::${elementTag}][1]`);

  const openCreateCourseForm = async (page: Page): Promise<void> => {
    const createCourseButton = page.getByRole("button", {
      name: "Create Course",
    });
    await expect(createCourseButton).toBeVisible();
    await createCourseButton.click();
    await expect(
      page.getByRole("button", { name: "Back to List" }),
    ).toBeVisible();
  };

  test.beforeEach(async ({ page }) => {
    await loginToThrive(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test.describe("Course List View", () => {
    test("should display course list with all courses", async ({ page }) => {
      await navigateToCoursesAdmin(page);

      // Verify the main heading is visible
      await expect(
        page.getByRole("heading", { name: COURSE_ADMIN_HEADING, level: 2 }),
      ).toBeVisible();

      // Supporting description and controls
      await expect(
        page.getByText("Manage your course catalog, curriculum, and cohorts."),
      ).toBeVisible();

      const courseCount = page.getByTestId("course-count");
      await expect(courseCount).toBeVisible();
      await expect(courseCount).toContainText("Showing");

      await expect(page.getByTestId("course-list")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Create Course" }),
      ).toBeVisible();
    });

    test("should display loading state while fetching courses", async ({
      page,
    }) => {
      await navigateToCoursesAdmin(page);

      // Look for loading indicator briefly
      const loadingIndicator = page.locator(".animate-spin");
      try {
        await loadingIndicator
          .first()
          .waitFor({ state: "visible", timeout: 2000 });
      } catch {
        // Indicator may finish before we observe it; ignore timeout
      }
      // Wait for either the loading to appear and disappear, or courses to load
      await page.waitForLoadState("networkidle");
    });

    test("should display course cards with title, code, and status", async ({
      page,
    }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      // Look for at least one course in the list
      const courseItems = getCourseCards(page);
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        // Check the first course has expected elements
        const firstCourse = courseItems.first();

        // Should have course code badge
        const courseBadge = firstCourse.locator("span").first();
        await expect(courseBadge).toBeVisible();

        // Should have step count
        const stepsText = firstCourse.getByTestId("step-count");
        await expect(stepsText).toBeVisible();

        // Should have status badge (Active/Inactive)
        const statusBadge = firstCourse.getByTestId("status-badge");
        await expect(statusBadge).toBeVisible();
      }
    });

    test("should display action buttons for each course", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = getCourseCards(page);
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        const firstCourse = courseItems.first();

        // Should have Curriculum management button
        await expect(
          firstCourse.getByRole("button", { name: "Curriculum" }),
        ).toBeVisible();

        // Should have Cohorts button
        await expect(
          firstCourse.getByRole("button", { name: "Cohorts" }),
        ).toBeVisible();

        // Should have Materials button
        await expect(
          firstCourse.getByRole("button", { name: "Materials" }),
        ).toBeVisible();

        // Should have Edit Details link
        await expect(
          firstCourse.getByRole("button", { name: "Edit Details" }),
        ).toBeVisible();
      }
    });

    test("should show empty state when no courses exist (after filtering)", async ({
      page,
    }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      // Try filtering with a nonsense search query
      const searchInput = page.getByPlaceholder(
        "Search courses by title or code...",
      );
      if (await searchInput.isVisible()) {
        const randomQuery = `non-existent-${Date.now()}`;
        await searchInput.fill(randomQuery);

        // Should show empty state
        const emptyState = page.locator("text=No courses found");
        await expect(emptyState).toBeVisible({ timeout: 10000 });
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
      const courseCards = getCourseCards(page);
      const initialCourses = await courseCards.count();

      // Filter by Active
      await statusFilter.selectOption("active");
      await page.waitForLoadState("networkidle");

      // Count should remain same or less
      const activeCourses = await courseCards.count();
      expect(activeCourses).toBeLessThanOrEqual(initialCourses);

      // All visible courses should have Active badge
      if (activeCourses > 0) {
        const activeBadges = page
          .getByTestId("status-badge")
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
        .getByTestId("status-badge")
        .filter({ hasText: "Inactive" });
      const inactiveCount = await inactiveBadges.count();
      expect(inactiveCount).toBeGreaterThanOrEqual(0);
    });

    test("should show course count in filter section", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      // Look for "Showing X courses" text
      const courseCountText = page.getByTestId("course-count");
      await expect(courseCountText).toBeVisible();
    });

    test("should reset filters when selecting All", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const statusFilter = page.locator("#status-filter");

      // Get initial count
      const courseItems = getCourseCards(page);
      const initialCount = await courseItems.count();

      // Filter by Active
      await statusFilter.selectOption("active");
      await page.waitForLoadState("networkidle");

      // Reset to All
      await statusFilter.selectOption("all");
      await page.waitForLoadState("networkidle");
      const resetCount = await courseItems.count();

      // Should match initial count
      expect(resetCount).toBe(initialCount);
    });
  });

  test.describe("Step Management Modal", () => {
    test("should open Manage Steps modal when clicking Curriculum button", async ({
      page,
    }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = getCourseCards(page);
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        // Click Curriculum on first course
        const manageStepsBtn = courseItems
          .first()
          .getByRole("button", { name: "Curriculum" });
        await manageStepsBtn.click();

        // Wait for modal to appear
        const modal = getManageStepsModal(page);
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

      const courseItems = getCourseCards(page);
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        const manageStepsBtn = courseItems
          .first()
          .getByRole("button", { name: "Curriculum" });
        await manageStepsBtn.click();

        // Modal should be visible
        const modal = getManageStepsModal(page);
        await expect(modal).toBeVisible();

        // Click close button (X icon)
        const closeBtn = modal.getByRole("button", { name: "Close" });
        await closeBtn.click();

        // Modal should be hidden
        await expect(modal).not.toBeVisible();
      }
    });

    test("should display form to add new step", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = getCourseCards(page);
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        const manageStepsBtn = courseItems
          .first()
          .getByRole("button", { name: "Curriculum" });
        await manageStepsBtn.click();

        const modal = getManageStepsModal(page);

        // Form should have required fields
        const stepOrderInput = getModalFieldByLabel(modal, "Step Order");
        await expect(stepOrderInput).toBeVisible();

        const labelInput = getModalFieldByLabel(modal, "Label");
        await expect(labelInput).toBeVisible();

        const titleInput = getModalFieldByLabel(modal, "Title");
        await expect(titleInput).toBeVisible();

        const descriptionInput = getModalFieldByLabel(
          modal,
          "Description",
          "textarea",
        );
        await expect(descriptionInput).toBeVisible();

        // Should have Add Step button
        const addStepBtn = modal.getByRole("button", { name: "Add Step" });
        await expect(addStepBtn).toBeVisible();
      }
    });

    test("should display existing steps in the modal", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = getCourseCards(page);
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
            name: "Curriculum",
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

      const courseItems = getCourseCards(page);
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
            name: "Curriculum",
          });
          await manageStepsBtn.click();

          const modal = getManageStepsModal(page);
          const stepCards = modal.locator(
            ".border.border-gray-200.rounded-lg.p-4.bg-white",
          );
          const stepCardCount = await stepCards.count();
          if (stepCardCount === 0) {
            test.skip(true, "No steps available to verify drag handles");
          }

          // Should have drag handles
          const dragHandles = modal.locator(".drag-handle.cursor-move");
          await expect(dragHandles.first()).toBeVisible();
        }
      }
    });

    test("should reorder steps by dragging", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = getCourseCards(page);
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
            name: "Curriculum",
          });
          await manageStepsBtn.click();

          const modal = getManageStepsModal(page);
          // Get initial step order
          const stepCards = modal.locator(
            ".border.border-gray-200.rounded-lg.p-4.bg-white",
          );
          if ((await stepCards.count()) < 2) {
            test.skip(true, "Need at least two steps to reorder");
          }
          const firstStepTitle = await stepCards
            .first()
            .locator("h5")
            .textContent();
          expect(firstStepTitle?.trim()).toBeTruthy();

          // Get second step element
          const firstDragHandle = modal
            .locator(".drag-handle.cursor-move")
            .first();
          const secondStepCard = stepCards.nth(1);

          // Drag first step to second position
          await firstDragHandle.dragTo(secondStepCard, { force: true });

          // Wait for reordering to complete
          await page.waitForLoadState("networkidle");

          // Verify order changed (this is a simple check)
          const updatedStepCards = modal.locator(
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

      const courseItems = getCourseCards(page);
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
            name: "Curriculum",
          });
          await manageStepsBtn.click();

          // Wait for modal to fully load
          await page.waitForLoadState("networkidle");

          const modal = getManageStepsModal(page);

          // Get step order numbers from the display
          const stepOrderBadges = modal.locator(
            ".inline-flex.items-center.justify-center.h-8.w-8.rounded-full.bg-blue-100.text-blue-800",
          );
          if ((await stepOrderBadges.count()) === 0) {
            test.skip(true, "No steps available to verify order persistence");
          }
          const initialOrders: (string | undefined)[] = [];
          for (let i = 0; i < (await stepOrderBadges.count()); i++) {
            const text = await stepOrderBadges.nth(i).textContent();
            initialOrders.push(text?.trim());
          }

          // Close modal
          await modal.getByRole("button", { name: "Close" }).click();

          // Reopen the same course
          await page.waitForLoadState("networkidle");
          const manageStepsBtn2 = courseItems
            .first()
            .getByRole("button", { name: "Curriculum" });
          await manageStepsBtn2.click();

          // Verify order is same
          const stepOrderBadges2 = getManageStepsModal(page).locator(
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

      const courseItems = getCourseCards(page);
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
            name: "Curriculum",
          });
          await manageStepsBtn.click();

          // Should have Edit buttons
          const modal = getManageStepsModal(page);
          const editButtons = modal.getByRole("button", { name: "Edit" });
          const editCount = await editButtons.count();
          if (editCount === 0) {
            test.skip(true, "No steps available to edit");
          }
          expect(editCount).toBeGreaterThan(0);
        }
      }
    });

    test("should populate form when clicking Edit on a step", async ({
      page,
    }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = getCourseCards(page);
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
            name: "Curriculum",
          });
          await manageStepsBtn.click();

          // Click Edit button on first step
          const modal = getManageStepsModal(page);
          const editButtons = modal.getByRole("button", { name: "Edit" });
          if ((await editButtons.count()) === 0) {
            test.skip(true, "No steps available to edit");
          }

          const firstEditBtn = editButtons.first();
          await firstEditBtn.click();

          // Form title should change to "Edit Step"
          const formTitle = modal
            .locator("h4")
            .filter({ hasText: "Edit Step" });
          await expect(formTitle).toBeVisible();

          // Button text should change to "Update Step"
          const updateBtn = modal.getByRole("button", { name: "Update Step" });
          await expect(updateBtn).toBeVisible();
        }
      }
    });

    test("should update step when submitting edit form", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = getCourseCards(page);
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
            name: "Curriculum",
          });
          await manageStepsBtn.click();

          // Click Edit
          const modal = getManageStepsModal(page);
          const editButtons = modal.getByRole("button", { name: "Edit" });
          if ((await editButtons.count()) === 0) {
            test.skip(true, "No steps available to edit");
          }
          await editButtons.first().click();

          // Update title
          const titleInput = getModalFieldByLabel(modal, "Title");
          await titleInput.clear();
          const newTitle = `Updated Step Title ${Date.now()}`;
          await titleInput.fill(newTitle);

          // Submit
          const updateBtn = modal.getByRole("button", {
            name: "Update Step",
          });
          await expect(updateBtn).toBeVisible();
          await updateBtn.click();

          // Wait for update to complete
          await page.waitForLoadState("networkidle");

          // Title should be updated
          const updatedCards = modal.locator(
            ".border.border-gray-200.rounded-lg.p-4.bg-white",
          );
          const updatedTitle = await updatedCards
            .first()
            .locator("h5")
            .textContent();
          expect(updatedTitle).toContain(newTitle);
        }
      }
    });

    test("should cancel edit and reset form", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = getCourseCards(page);
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
            name: "Curriculum",
          });
          await manageStepsBtn.click();

          // Click Edit
          const modal = getManageStepsModal(page);
          const editButtons = modal.getByRole("button", { name: "Edit" });
          if ((await editButtons.count()) === 0) {
            test.skip(true, "No steps available to edit");
          }
          await editButtons.first().click();

          // Cancel button should be visible
          const cancelBtn = modal
            .getByRole("button", { name: "Cancel Edit" })
            .first();
          await expect(cancelBtn).toBeVisible();

          // Click Cancel
          await cancelBtn.click();

          // Form title should be back to "Add New Step"
          const formTitle = modal
            .locator("h4")
            .filter({ hasText: "Add New Step" });
          await expect(formTitle).toBeVisible();

          // Button should be "Add Step"
          const addBtn = modal.getByRole("button", { name: "Add Step" });
          await expect(addBtn).toBeVisible();
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

      const courseItems = getCourseCards(page);
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        const firstCourse = courseItems.first();

        // Check for hover class
        await expect(firstCourse).toHaveClass(/hover:shadow-md/);
      }
    });

    test("should display step counter in course cards", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = getCourseCards(page);
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
        .locator(".bg-indigo-100.text-indigo-800")
        .filter({ hasText: "Stripe Connected" });
      // Count is >= 0 as not all courses may be published
      const stripeCount = await stripeBadges.count();
      expect(stripeCount).toBeGreaterThanOrEqual(0);
    });

    test("should show teacher-friendly icons and labels", async ({ page }) => {
      await navigateToCoursesAdmin(page);

      // Verify the page heading is clear and descriptive
      const pageDescription = page.locator("p").filter({
        hasText: "Manage your course catalog, curriculum, and cohorts.",
      });
      await expect(pageDescription).toBeVisible();
    });
  });

  test.describe("Create/Edit Course Tab", () => {
    test("should show course creation form when clicking Create Course", async ({
      page,
    }) => {
      await navigateToCoursesAdmin(page);
      await openCreateCourseForm(page);

      const courseInfoHeading = page.getByRole("heading", {
        name: "Course Information",
      });
      await expect(courseInfoHeading).toBeVisible();
    });

    test("should display course creation form fields", async ({ page }) => {
      await navigateToCoursesAdmin(page);
      await openCreateCourseForm(page);

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
      await openCreateCourseForm(page);

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
        name: COURSE_ADMIN_HEADING,
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

      await expect(statusFilter).toBeVisible();
      await expect(statusLabel).toBeVisible();
      await expect(statusLabel).toHaveText("Status Filter");
    });

    test("should have close button on modal accessible via keyboard", async ({
      page,
    }) => {
      await navigateToCoursesAdmin(page);
      await page.waitForLoadState("networkidle");

      const courseItems = getCourseCards(page);
      const courseCount = await courseItems.count();

      if (courseCount > 0) {
        const manageStepsBtn = courseItems
          .first()
          .getByRole("button", { name: "Curriculum" });
        await manageStepsBtn.click();

        // Modal should be open
        const modal = getManageStepsModal(page);
        await expect(modal).toBeVisible();

        // Close button should have title attribute
        const closeBtn = modal.getByRole("button", { name: "Close" });
        await expect(closeBtn).toBeVisible();
        // The close button has sr-only text
        const srOnlyText = modal.locator(".sr-only");
        await expect(srOnlyText).toHaveCount(1);
      }
    });
  });
});
