import { test, expect, Page } from "@playwright/test";

test.describe("Course Materials E2E", () => {
  const adminEmail = "admin@thrive.com";
  const studentEmail = "student@thrive.com";
  const password = "thrive_test_123";

  const courseName = "E2E Test Course";
  const stepName = "Step 1: Introduction";

  // TODO: Update this URL to the actual frontend URL for the course step
  const courseStepUrl = "/course/e2e-test-course/step-1";

  async function login(page: Page, email: string) {
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

  test.describe("Flow 1: Admin - Create Course Materials", () => {
    test.beforeEach(async ({ page }) => {
      page.on("console", (msg) => console.log(`BROWSER LOG: ${msg.text()}`));
      await login(page, adminEmail);
    });

    test("should populate a Course Step with learning materials", async ({
      page,
    }) => {
      // 2. Navigate to the "Course Materials" management page
      await page.goto("/wp-admin/admin.php?page=thrive-course-materials");
      await expect(
        page.getByRole("heading", { name: "Course Materials Builder" }),
      ).toBeVisible();

      // 3. Select Context: Choose "E2E Test Course" and "Step 1: Introduction"
      // Assuming dropdowns exist for selection
      await page
        .getByLabel("Select Course")
        .selectOption({ label: courseName });
      await page.getByLabel("Select Step").selectOption({ label: stepName });

      // 4. Add "Rich Text" Material
      await page.getByRole("button", { name: "Add Material" }).click();
      await page.getByLabel("Type").selectOption("rich_text");
      await page.getByLabel("Title").fill("Welcome to the Course");
      await page.getByLabel("Content").fill("This is the introduction text.");
      await page.getByRole("button", { name: "Save" }).click();

      // Verify Material appears in the list
      await expect(page.getByText("Welcome to the Course")).toBeVisible();

      // 5. Add "Video" Material
      await page.getByRole("button", { name: "Add Material" }).click();
      await page.getByLabel("Type").selectOption("video_embed");
      await page.getByLabel("Title").fill("Intro Video");
      await page
        .getByLabel("Content")
        .fill(
          '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
        );
      await page.getByRole("button", { name: "Save" }).click();

      // Verify Material appears in the list
      await expect(page.getByText("Intro Video")).toBeVisible();

      // 6. Add "Multiple Choice Question" Material
      await page.getByRole("button", { name: "Add Material" }).click();
      await page.getByLabel("Type").selectOption("question");
      await page.getByLabel("Title").fill("Knowledge Check 1");
      await page.getByLabel("Question Type").selectOption("multiple_choice");
      await page.getByLabel("Question Text").fill("What is 2 + 2?");

      // Add Options
      await page.getByRole("button", { name: "Add Option" }).click();
      await page.getByPlaceholder("Option text").last().fill("3"); // Option A

      await page.getByRole("button", { name: "Add Option" }).click();
      await page.getByPlaceholder("Option text").last().fill("4"); // Option B
      await page.getByRole("checkbox", { name: "Correct" }).last().check(); // Mark B as correct

      await page.getByRole("button", { name: "Save Material" }).click();

      // Verify Material appears in the list
      await expect(page.getByText("Knowledge Check 1")).toBeVisible();

      // 7. Add "Long Text Question" Material
      await page.getByRole("button", { name: "Add Material" }).click();
      await page.getByLabel("Type").selectOption("question");
      await page.getByLabel("Title").fill("Essay Assignment");
      await page.getByLabel("Question Type").selectOption("long_text");
      await page.getByLabel("Question Text").fill("Describe your goals.");
      await page.getByRole("button", { name: "Save Material" }).click();

      // Verify Material appears in the list
      await expect(page.getByText("Essay Assignment")).toBeVisible();

      // 8. Reorder Materials (Optional)
      // Drag "Intro Video" above "Welcome to the Course"
      const videoRow = page.getByText("Intro Video");
      const welcomeRow = page.getByText("Welcome to the Course");
      await videoRow.dragTo(welcomeRow);
      await page.getByRole("button", { name: "Save Order" }).click();
    });
  });

  test.describe("Flow 2: Student - Self-Study & Progress Tracking", () => {
    test.beforeEach(async ({ page }) => {
      await login(page, studentEmail);
    });

    test("should consume content, track progress, and submit answers", async ({
      page,
    }) => {
      // 2. Navigate to the "Step 1: Introduction" page
      await page.goto(courseStepUrl);

      // 3. Verify Initial State
      // Assuming "Intro Video" is first after reordering, or "Welcome to the Course" if reordering failed/skipped
      // The test plan says "Welcome to the Course" (or first item) is displayed.
      // Let's assume the order from Flow 1 persisted or we check for the first item.

      // Check for the materials block
      await expect(
        page.getByRole("heading", { name: "Course Materials" }),
      ).toBeVisible();

      // 4. Consume Rich Text (assuming it's visible or we navigate to it)
      // If it's a list, we might need to click it. If it's a linear flow, it might be displayed.
      // The plan says "Welcome to the Course" is displayed.

      // Let's assume we start with "Welcome to the Course"
      // If reorder worked, "Intro Video" is first. If not, "Welcome to the Course".
      // We can check which one is active.

      // For this test, let's assume we find "Welcome to the Course" in the list and click it if needed,
      // or it's the current item.

      // Find "Welcome to the Course" in the material list/navigation
      const welcomeMaterial = page.getByText("Welcome to the Course");
      await expect(welcomeMaterial).toBeVisible();
      // If it's not active, click it (assuming there's a sidebar or list)
      // await welcomeMaterial.click();

      // Verify content
      await expect(
        page.getByText("This is the introduction text."),
      ).toBeVisible();

      // Click "Mark as Complete"
      await page.getByRole("button", { name: "Mark as Complete" }).click();

      // Verify Status icon changes to "Completed"
      // This depends on how the icon is rendered. Maybe an aria-label or class.
      await expect(page.locator(".status-icon.completed")).toBeVisible(); // Placeholder selector

      // Verify automatically advances to next material ("Intro Video")
      await expect(page.getByText("Intro Video")).toBeVisible();

      // 5. Consume Video
      await expect(page.locator("iframe")).toBeVisible();
      await page.getByRole("button", { name: "Mark as Complete" }).click();

      // Verify Status icon changes to "Completed"
      // Verify Advances to "Knowledge Check 1"
      await expect(page.getByText("Knowledge Check 1")).toBeVisible();
      await expect(page.getByText("What is 2 + 2?")).toBeVisible();

      // 6. Submit Multiple Choice (Correct)
      await page.getByLabel("4").check();
      await page.getByRole("button", { name: "Submit Answer" }).click();

      // Verify UI shows "Answer Submitted!" / "Correct"
      await expect(page.getByText("Correct")).toBeVisible();

      // Verify Progress marks as "Completed"
      // Verify Advances to "Essay Assignment"
      // Maybe there is a "Next" button or auto-advance
      if (await page.getByRole("button", { name: "Next" }).isVisible()) {
        await page.getByRole("button", { name: "Next" }).click();
      }

      await expect(page.getByText("Essay Assignment")).toBeVisible();
      await expect(page.getByText("Describe your goals.")).toBeVisible();

      // Submit Essay
      await page.getByRole("textbox").fill("My goal is to learn Playwright.");
      await page.getByRole("button", { name: "Submit Answer" }).click();
      await expect(page.getByText("Answer Submitted")).toBeVisible();
    });
  });
});
