#!/usr/bin/env node
/**
 * Simple Puppeteer test to verify login button & modal behavior.
 */
const puppeteer = require("puppeteer");

(async () => {
  const baseUrl = process.env.WP_BASE_URL || "http://localhost:8080";
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  console.log("Navigating to", baseUrl);
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

  // Ensure login button exists
  await page.waitForSelector("#thrive-login-button");
  console.log("Login button found");

  // Click button and check modal opens
  await page.click("#thrive-login-button");
  await page.waitForSelector("#thrive-login-modal.is-open");
  console.log("Modal opened");

  // Ensure Google button is present
  await page.waitForSelector("#thrive-google-login");
  console.log("Google login button present");

  // Close modal
  await page.click(".thrive-login-modal__close");
  await page.waitForSelector("#thrive-login-modal:not(.is-open)");
  console.log("Modal closed");

  await browser.close();
  console.log("Test completed successfully");
})().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
