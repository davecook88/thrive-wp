import { Page, expect } from "@playwright/test";

export const adminEmail = "admin@thrive.com";
export const adminPassword = "thrive_test_123";
export const wpAdminUsername = "admin@thrive.com"; // WordPress accepts email as username

export async function loginToThrive(page: Page) {
  await page.goto("/");

  // Check if already logged in
  const signInButton = page.getByRole("button", { name: "Sign in" });
  if ((await signInButton.count()) === 0) {
    // Check if we are actually logged in by looking for sign out
    if (await page.getByRole("button", { name: "Sign out" }).isVisible()) {
      return;
    }
  }

  if (await signInButton.isVisible()) {
    await signInButton.click();

    // Wait for modal dialog
    const dialog = page.getByRole("dialog", { name: "Sign In" });
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Fill credentials
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);

    // Submit
    await page.getByRole("button", { name: "Sign in with Email" }).click();

    // Verify modal is gone
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
  }

  // Wait for a moment to ensure cookies are set and UI updates
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible({
    timeout: 10000,
  });

  // Verify cookie is set
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((c) => c.name === "thrive_sess");
  if (!sessionCookie) {
    console.warn("Warning: thrive_sess cookie not found after login");
  }
}

export async function loginAsAdmin(page: Page) {
  await page.goto("/wp-login.php");
  await handleWpAdminLogin(page);
}

/**
 * Handle WordPress admin login.
 * This is needed when navigating to /wp-admin without the X-Auth-Context header.
 * After logging in to Thrive, the Nginx proxy should inject auth headers,
 * but if wp-login.php still appears, this function will login directly.
 */
export async function handleWpAdminLogin(page: Page) {
  // Check if we're on the WordPress login page
  const wpLoginForm = page.locator("#loginform");
  const isLoginPage = await wpLoginForm.isVisible();
  if (!isLoginPage) {
    console.log("Not on WordPress login page, no need to login.");
    return; // No need to login
  }

  console.log("On WordPress login page, attempting to login...");
  console.log(`Current URL: ${page.url()}`);

  // Wait a moment for any JavaScript to load
  await page.waitForLoadState("domcontentloaded");

  // Fill in WordPress admin credentials
  const userLogin = page.locator("#user_login");
  const userPass = page.locator("#user_pass");
  const submitBtn = page.locator('button[type="submit"], input[type="submit"]');

  console.log(`Filling username: ${wpAdminUsername}`);
  await userLogin.fill(wpAdminUsername);

  console.log(`Filling password`);
  await userPass.fill(adminPassword);

  // Log form values for debugging
  const loginValue = await userLogin.inputValue();
  const passValue = await userPass.inputValue();
  console.log(`Username field value: ${loginValue}`);
  console.log(`Password field has value: ${passValue ? "yes" : "no"}`);

  console.log("Clicking submit button");
  // Wait for navigation after clicking
  await Promise.all([
    page.waitForNavigation({ waitUntil: "load" }),
    submitBtn.click(),
  ]);

  console.log(`URL after login attempt: ${page.url()}`);

  // Check if login was successful by looking for error messages
  const errorMessage = page.locator(
    "#login_error, .login-error, .wp-error, .notice-error",
  );
  if ((await errorMessage.count()) > 0) {
    const errorText = await errorMessage.first().textContent();
    console.log(`Login error message found: ${errorText}`);
  }

  console.log("Login complete");
}
