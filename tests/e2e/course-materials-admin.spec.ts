import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./utils/auth";

test.describe("Admin Course Materials", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should navigate to course materials page and show program dropdown", async ({
    page,
  }) => {
    // Navigate to the Course Materials page
    await page.goto("/wp-admin/admin.php?page=thrive-course-materials");

    // Verify the page title or heading
    await expect(page.locator("h1")).toContainText("Course Materials");

    // Check if the Course Program dropdown exists and is populated
    const programSelect = page.locator("select#course-program-select"); // Adjust selector as needed
    await expect(programSelect).toBeVisible();

    // Verify that there are options in the dropdown (excluding the default "Select" option)
    const options = programSelect.locator("option");
    const count = await options.count();
    expect(count).toBeGreaterThan(1);
  });

  test("should allow selecting a course program", async ({ page }) => {
    await page.goto("/wp-admin/admin.php?page=thrive-course-materials");

    const programSelect = page.locator("select#course-program-select"); // Adjust selector as needed

    // Get the value of the second option (the first actual course)
    const secondOptionValue = await programSelect
      .locator("option")
      .nth(1)
      .getAttribute("value");

    if (secondOptionValue) {
      await programSelect.selectOption(secondOptionValue);

      // Verify that the selection was successful
      await expect(programSelect).toHaveValue(secondOptionValue);
    } else {
      test.skip(true, "No course programs available to select");
    }
  });
});
