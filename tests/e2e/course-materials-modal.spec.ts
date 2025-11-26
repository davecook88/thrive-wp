import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./utils/auth";
import { createTestCourse, createTestCourseStep } from "./utils/api";

test.describe("Course Materials Modal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should open materials modal from course card", async ({ page }) => {
    // Create a test course with steps
    const course = await createTestCourse({
      code: "MAT-TEST",
      title: "Materials Test Course",
      description: "Course for testing materials modal",
      isActive: true,
      levelIds: [],
    });

    await createTestCourseStep({
      courseProgramId: course.id,
      stepOrder: 1,
      label: "MAT-TEST-1",
      title: "First Step",
      description: "Test step",
      isRequired: true,
    });

    // Navigate to courses admin
    await page.goto("/wp-admin/admin.php?page=thrive-courses");
    await page.waitForLoadState("networkidle");

    // Find the Materials button and click it
    await page.getByRole("button", { name: "Materials" }).first().click();

    // Verify modal is open
    await expect(
      page.getByText("Manage Materials: Materials Test Course"),
    ).toBeVisible();

    // Verify step is listed in sidebar
    await expect(page.getByText("MAT-TEST-1")).toBeVisible();
    await expect(page.getByText("First Step")).toBeVisible();
  });

  test("should create a text material", async ({ page }) => {
    // Create a test course with a step
    const course = await createTestCourse({
      code: "TEXT-TEST",
      title: "Text Material Test",
      isActive: true,
      levelIds: [],
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _step = await createTestCourseStep({
      courseProgramId: course.id,
      stepOrder: 1,
      label: "TEXT-TEST-1",
      title: "Text Step",
      isRequired: true,
    });

    // Navigate to courses admin
    await page.goto("/wp-admin/admin.php?page=thrive-courses");
    await page.waitForLoadState("networkidle");

    // Open materials modal
    await page.getByRole("button", { name: "Materials" }).first().click();

    // Wait for modal and select step
    await expect(
      page.getByText("Manage Materials: Text Material Test"),
    ).toBeVisible();
    await page.getByText("TEXT-TEST-1").click();

    // Click Add Material button
    await page.getByRole("button", { name: "Add Material" }).click();

    // Verify form slide-out is open
    await expect(page.getByText("Add New Material")).toBeVisible();

    // Select Rich Text type (should be selected by default)
    await expect(page.getByText("Text").first()).toBeVisible();

    // Fill in the form
    await page.getByLabel("Title *").fill("Introduction to the Course");
    await page.getByLabel("Description").fill("A brief introduction");
    await page
      .getByLabel("Content *")
      .fill("Welcome to our course! This is some rich text content.");

    // Submit the form
    await page.getByRole("button", { name: "Add Material" }).click();

    // Verify material appears in the list
    await expect(page.getByText("Introduction to the Course")).toBeVisible();
    await expect(page.getByText("A brief introduction")).toBeVisible();
    await expect(page.getByText("Text", { exact: false })).toBeVisible();
  });

  test("should create a video material", async ({ page }) => {
    const course = await createTestCourse({
      code: "VID-TEST",
      title: "Video Material Test",
      isActive: true,
      levelIds: [],
    });

    await createTestCourseStep({
      courseProgramId: course.id,
      stepOrder: 1,
      label: "VID-TEST-1",
      title: "Video Step",
      isRequired: true,
    });

    // Navigate and open modal
    await page.goto("/wp-admin/admin.php?page=thrive-courses");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Materials" }).first().click();

    // Select step and add material
    await page.getByText("VID-TEST-1").click();
    await page.getByRole("button", { name: "Add Material" }).click();

    // Select Video type
    await page.getByRole("button", { name: /Video/ }).click();

    // Fill in the form
    await page.getByLabel("Title *").fill("Welcome Video");
    await page.getByLabel("Description").fill("Introduction video");
    await page
      .getByLabel("Video URL *")
      .fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    // Submit
    await page.getByRole("button", { name: "Add Material" }).click();

    // Verify
    await expect(page.getByText("Welcome Video")).toBeVisible();
    await expect(page.getByText("Video")).toBeVisible();
  });

  test("should create a question material with multiple choice", async ({
    page,
  }) => {
    const course = await createTestCourse({
      code: "QUIZ-TEST",
      title: "Quiz Material Test",
      isActive: true,
      levelIds: [],
    });

    await createTestCourseStep({
      courseProgramId: course.id,
      stepOrder: 1,
      label: "QUIZ-TEST-1",
      title: "Quiz Step",
      isRequired: true,
    });

    // Navigate and open modal
    await page.goto("/wp-admin/admin.php?page=thrive-courses");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Materials" }).first().click();

    // Select step and add material
    await page.getByText("QUIZ-TEST-1").click();
    await page.getByRole("button", { name: "Add Material" }).click();

    // Select Question type
    await page.getByRole("button", { name: /Question/ }).click();

    // Fill in the form
    await page.getByLabel("Title *").fill("Knowledge Check");
    await page.getByLabel("Question Text *").fill("What is 2 + 2?");

    // Verify question type dropdown
    await expect(page.getByLabel("Question Type *")).toHaveValue(
      "multiple_choice",
    );

    // Fill in multiple choice options
    const optionInputs = page.locator('input[placeholder^="Option"]');
    await optionInputs.nth(0).fill("3");
    await optionInputs.nth(1).fill("4");

    // Mark the second option as correct
    const correctCheckboxes = page
      .locator('input[type="checkbox"]')
      .filter({ hasText: /Correct/ });
    await correctCheckboxes.nth(1).check();

    // Add a third option
    await page.getByRole("button", { name: "+ Add Option" }).click();
    await optionInputs.nth(2).fill("5");

    // Submit
    await page.getByRole("button", { name: "Add Material" }).click();

    // Verify
    await expect(page.getByText("Knowledge Check")).toBeVisible();
    await expect(page.getByText("Question")).toBeVisible();
    await expect(
      page.getByText("Multiple Choice: What is 2 + 2?"),
    ).toBeVisible();
  });

  test("should edit an existing material", async ({ page }) => {
    const course = await createTestCourse({
      code: "EDIT-TEST",
      title: "Edit Material Test",
      isActive: true,
      levelIds: [],
    });

    const step = await createTestCourseStep({
      courseProgramId: course.id,
      stepOrder: 1,
      label: "EDIT-TEST-1",
      title: "Edit Step",
      isRequired: true,
    });

    // Create a material via API
    await fetch("http://localhost:3000/api/course-materials", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        courseStepId: step.id,
        title: "Original Title",
        description: "Original description",
        type: "rich_text",
        content: "Original content",
        order: 1,
      }),
    });

    // Navigate and open modal
    await page.goto("/wp-admin/admin.php?page=thrive-courses");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Materials" }).first().click();

    // Select step
    await page.getByText("EDIT-TEST-1").click();

    // Wait for material to load
    await expect(page.getByText("Original Title")).toBeVisible();

    // Click Edit button
    await page.getByRole("button", { name: "Edit" }).first().click();

    // Verify form is pre-filled
    await expect(page.getByLabel("Title *")).toHaveValue("Original Title");
    await expect(page.getByLabel("Description")).toHaveValue(
      "Original description",
    );
    await expect(page.getByLabel("Content *")).toHaveValue("Original content");

    // Update the values
    await page.getByLabel("Title *").fill("Updated Title");
    await page.getByLabel("Description").fill("Updated description");

    // Submit
    await page.getByRole("button", { name: "Update Material" }).click();

    // Verify updated values
    await expect(page.getByText("Updated Title")).toBeVisible();
    await expect(page.getByText("Updated description")).toBeVisible();
    await expect(page.getByText("Original Title")).not.toBeVisible();
  });

  test("should delete a material", async ({ page }) => {
    const course = await createTestCourse({
      code: "DEL-TEST",
      title: "Delete Material Test",
      isActive: true,
      levelIds: [],
    });

    const step = await createTestCourseStep({
      courseProgramId: course.id,
      stepOrder: 1,
      label: "DEL-TEST-1",
      title: "Delete Step",
      isRequired: true,
    });

    // Create a material via API
    await fetch("http://localhost:3000/api/course-materials", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        courseStepId: step.id,
        title: "Material to Delete",
        type: "rich_text",
        content: "This will be deleted",
        order: 1,
      }),
    });

    // Navigate and open modal
    await page.goto("/wp-admin/admin.php?page=thrive-courses");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Materials" }).first().click();

    // Select step
    await page.getByText("DEL-TEST-1").click();

    // Wait for material to load
    await expect(page.getByText("Material to Delete")).toBeVisible();

    // Set up dialog handler for confirmation
    page.on("dialog", (dialog) => dialog.accept());

    // Click Delete button
    await page.getByRole("button", { name: "Delete" }).first().click();

    // Verify material is removed
    await expect(page.getByText("Material to Delete")).not.toBeVisible();
    await expect(page.getByText("No materials yet")).toBeVisible();
  });

  test("should show material count for each step", async ({ page }) => {
    const course = await createTestCourse({
      code: "COUNT-TEST",
      title: "Count Test Course",
      isActive: true,
      levelIds: [],
    });

    const step1 = await createTestCourseStep({
      courseProgramId: course.id,
      stepOrder: 1,
      label: "COUNT-TEST-1",
      title: "Step 1",
      isRequired: true,
    });

    const step2 = await createTestCourseStep({
      courseProgramId: course.id,
      stepOrder: 2,
      label: "COUNT-TEST-2",
      title: "Step 2",
      isRequired: true,
    });

    // Add 3 materials to step 1
    for (let i = 1; i <= 3; i++) {
      await fetch("http://localhost:3000/api/course-materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          courseStepId: step1.id,
          title: `Step 1 Material ${i}`,
          type: "rich_text",
          content: `Content ${i}`,
          order: i,
        }),
      });
    }

    // Add 1 material to step 2
    await fetch("http://localhost:3000/api/course-materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        courseStepId: step2.id,
        title: "Step 2 Material 1",
        type: "rich_text",
        content: "Content",
        order: 1,
      }),
    });

    // Navigate and open modal
    await page.goto("/wp-admin/admin.php?page=thrive-courses");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Materials" }).first().click();

    // Verify material counts in sidebar
    const step1Button = page.locator("button", { hasText: "COUNT-TEST-1" });
    await expect(step1Button).toContainText("3 materials");

    const step2Button = page.locator("button", { hasText: "COUNT-TEST-2" });
    await expect(step2Button).toContainText("1 materials");
  });

  test("should handle empty state when no steps exist", async ({ page }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _course = await createTestCourse({
      code: "EMPTY-TEST",
      title: "Empty Test Course",
      isActive: true,
      levelIds: [],
    });

    // Navigate and open modal
    await page.goto("/wp-admin/admin.php?page=thrive-courses");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Materials" }).first().click();

    // Verify empty state
    await expect(
      page.getByText("No steps yet. Add steps in the Curriculum section."),
    ).toBeVisible();
  });

  test("should close modal and preserve data", async ({ page }) => {
    const course = await createTestCourse({
      code: "CLOSE-TEST",
      title: "Close Test Course",
      isActive: true,
      levelIds: [],
    });

    const step = await createTestCourseStep({
      courseProgramId: course.id,
      stepOrder: 1,
      label: "CLOSE-TEST-1",
      title: "Test Step",
      isRequired: true,
    });

    // Create a material
    await fetch("http://localhost:3000/api/course-materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        courseStepId: step.id,
        title: "Persistent Material",
        type: "rich_text",
        content: "This should persist",
        order: 1,
      }),
    });

    // Navigate and open modal
    await page.goto("/wp-admin/admin.php?page=thrive-courses");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Materials" }).first().click();

    // Select step and verify material
    await page.getByText("CLOSE-TEST-1").click();
    await expect(page.getByText("Persistent Material")).toBeVisible();

    // Close modal (click X button)
    await page.locator('button[aria-label="Close"]').first().click();

    // Modal should be closed
    await expect(page.getByText("Manage Materials:")).not.toBeVisible();

    // Reopen modal
    await page.getByRole("button", { name: "Materials" }).first().click();

    // Select step again
    await page.getByText("CLOSE-TEST-1").click();

    // Material should still be there
    await expect(page.getByText("Persistent Material")).toBeVisible();
  });
});
