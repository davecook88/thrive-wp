import { test, expect } from '@playwright/test';

test('student can login and navigate to dashboard', async ({ page }) => {
  // 1. Navigate to home
  await page.goto('/');

  // 2. Login as student
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('dialog', { name: 'Sign In' })).toBeVisible();

  await page.fill('input[type="email"]', 'student@thrive.com');
  await page.fill('input[type="password"]', 'thrive_test_123');
  await page.getByRole('button', { name: 'Sign in with Email' }).click();

  // 3. Verify login state
  await expect(page.getByRole('button', { name: 'Sign in' })).not.toBeVisible();
  // Check for user menu or sign out button - based on previous exploration
  // The button text might be "Sign out Test Student" or similar
  await expect(page.getByText('Sign out')).toBeVisible();

  // 4. Navigate to /student
  await page.goto('/student');

  // 5. Verify dashboard
  await expect(page).toHaveTitle(/Student Dashboard/);
  await expect(page.getByRole('heading', { name: 'Student Dashboard' })).toBeVisible();
});
