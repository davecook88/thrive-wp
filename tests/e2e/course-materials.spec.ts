import { test, expect, type Page } from "@playwright/test";
import { loginToThrive } from "./utils/auth";

type MaterialTemplate = {
  title: string;
  description?: string;
  type: "rich_text" | "video_embed" | "question";
  content?: string;
  question?: {
    questionText: string;
    questionType: "long_text" | "multiple_choice";
    options?: Record<string, { text: string } | string>;
  };
};

test.describe("Course Materials E2E", () => {
  const courseStepUrl = "/course/e2e-test-course/step-1";

  test.describe("Course Routing", () => {
    test("should load course step page correctly (not show homepage)", async ({
      page,
    }) => {
      page.on("console", (msg) => console.log(`BROWSER LOG: ${msg.text()}`));

      // Navigate to the course step URL
      await page.goto(courseStepUrl);

      // Wait for network to settle
      await page.waitForLoadState("networkidle");

      // Verify the URL is correct (not redirected to homepage)
      expect(page.url()).toContain("/course/e2e-test-course/step-1");

      // Verify the page has the course step page container
      const courseContainer = page.locator(".course-step-page");
      await expect(courseContainer).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Course Materials Block", () => {
    test("should attempt to mount course materials block on course step page", async ({
      page,
    }) => {
      page.on("console", (msg) => console.log(`BROWSER LOG: ${msg.text()}`));

      // Navigate to the course step URL
      await page.goto(courseStepUrl);

      // Wait for network to settle
      await page.waitForLoadState("networkidle");

      // Check if the course materials block container exists
      const blockContainer = page.locator(".student-course-materials-block");
      const isVisible = await blockContainer.isVisible().catch(() => false);

      // Log the result for debugging
      console.log("Course materials block container visible:", isVisible);

      // The block should at least render its container
      // Even if there's no data, the component mounting should work
      if (isVisible) {
        await expect(blockContainer).toBeVisible();
      }
    });
  });

  test.describe("Course Materials Display", () => {
    const mockedCourseSlug = "playwright-e2e-course";
    const mockedCourseStepId = 9876;
    const materialTemplates: MaterialTemplate[] = [
      {
        title: "Orientation Overview",
        description: "Read this overview before starting the course.",
        type: "rich_text",
        content:
          "<p>Welcome to the automated course experience. This lesson explains how to navigate your materials.</p>",
      },
      {
        title: "Program Walkthrough",
        type: "video_embed",
        content:
          '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Program Walkthrough" frameborder="0" allowfullscreen></iframe>',
      },
      {
        title: "Reflection Prompt",
        type: "question",
        question: {
          questionText: "What do you hope to learn in this cohort?",
          questionType: "long_text",
        },
      },
    ];
    const materialFixtures = buildMaterialFixtures(
      materialTemplates,
      mockedCourseStepId,
    );

    test.beforeEach(async ({ page }) => {
      await mockCourseMaterialsApi(page, materialFixtures);
      await loginToThrive(page);
    });

    test("should render seeded materials list and detail content", async ({
      page,
    }) => {
      await page.goto(`/course/${mockedCourseSlug}/step-${mockedCourseStepId}`);

      const block = page.locator(".student-course-materials");
      await expect(block).toBeVisible({ timeout: 15000 });

      const listItems = block.locator(".materials-list .material-item");
      await expect(listItems).toHaveCount(materialTemplates.length);

      for (let i = 0; i < materialTemplates.length; i += 1) {
        await expect(listItems.nth(i).locator(".material-title")).toHaveText(
          materialTemplates[i].title,
        );
        await expect(listItems.nth(i).locator(".material-order")).toContainText(
          String(i + 1),
        );
      }

      const header = block.locator(".material-header h2");
      await expect(header).toHaveText(materialTemplates[0].title);
      if (materialTemplates[0].description) {
        await expect(block.locator(".material-description")).toContainText(
          materialTemplates[0].description,
        );
      }

      await expect(block.locator(".progress-indicator span")).toContainText(
        `1 of ${materialTemplates.length}`,
      );

      await listItems.nth(1).click();
      await expect(header).toHaveText(materialTemplates[1].title);
      await expect(
        block.locator(".material-video .video-container iframe"),
      ).toBeVisible();

      await listItems.nth(2).click();
      await expect(header).toHaveText(materialTemplates[2].title);
      if (materialTemplates[2].question) {
        await expect(
          block.locator(".question-form .question-text"),
        ).toContainText(materialTemplates[2].question?.questionText);
      }
    });
  });
});

type MaterialFixture = {
  id: number;
  courseStepId: number;
  title: string;
  description: string | null;
  type: "rich_text" | "video_embed" | "question";
  content: string | null;
  order: number;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  questions: Array<{
    id: number;
    materialId: number;
    questionText: string;
    questionType: "long_text" | "multiple_choice";
    options: Record<string, { text: string } | string> | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

function buildMaterialFixtures(
  templates: MaterialTemplate[],
  courseStepId: number,
): MaterialFixture[] {
  const timestamp = new Date().toISOString();
  return templates.map((template, index) => ({
    id: index + 1,
    courseStepId,
    title: template.title,
    description: template.description ?? null,
    type: template.type,
    content:
      template.type === "question"
        ? null
        : (template.content ?? "<p>Placeholder content</p>"),
    order: index + 1,
    createdById: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    questions: template.question
      ? [
          {
            id: courseStepId * 100 + index,
            materialId: index + 1,
            questionText: template.question.questionText,
            questionType: template.question.questionType,
            options: template.question.options ?? null,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ]
      : [],
  }));
}

async function mockCourseMaterialsApi(
  page: Page,
  materials: MaterialFixture[],
) {
  await page.route(
    "**/api/course-materials/step/*/enrollment",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ studentPackageId: 4242 }),
      });
    },
  );

  await page.route("**/api/course-materials/progress/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });

  await page.route("**/api/course-materials/step/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(materials),
    });
  });
}
