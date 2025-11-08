import { test, expect } from "@playwright/test";

const PRIMARY_INPUT = "[data-testid='primary-input']";
const PASSWORD_INPUT = "[data-testid='password-input']";
const DROPDOWN_HOST = "#nativefill-dropdown-host";

const resetHarness = async (page: import("@playwright/test").Page) => {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await page.goto("/");
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(200);
    }
  }
  if (lastError) {
    throw lastError;
  }
  await page.waitForSelector(PRIMARY_INPUT);
  await page.waitForSelector(DROPDOWN_HOST, { state: "attached" });
  await page.evaluate(() => {
    (window as any).nativefillHarness.reset();
  });
};

test.describe("Harness E2E", () => {
  test.skip(({ browserName }) => browserName === "firefox", "Harness server currently inaccessible in Firefox headless mode");
  test("TP-001 suggestions appear quickly and apply via Enter", async ({ page }) => {
    await resetHarness(page);
    const input = page.locator(PRIMARY_INPUT);
    await input.click();
    await input.type("Kon");
    const dropdown = page.locator(DROPDOWN_HOST);
    await expect(dropdown).toBeVisible({ timeout: 200 });
    await page.keyboard.press("Enter");
    await expect(input).toHaveValue("konrad@example.com");
  });

  test("TP-002 context fill populates active field", async ({ page }) => {
    await resetHarness(page);
    const input = page.locator(PRIMARY_INPUT);
    await input.click();
    await page.evaluate(() => {
      (window as any).nativefillHarness.contextFill("sample-address");
    });
    await expect(input).toHaveValue("1600 Market St, San Francisco, CA");
  });

  test("TP-003 Alt+ArrowDown forces dropdown despite overlay", async ({ page }) => {
    await resetHarness(page);
    await page.evaluate(() => {
      (window as any).nativefillHarness.toggleOverlay(true);
    });
    const dropdown = page.locator(DROPDOWN_HOST);
    await expect(dropdown).toBeHidden();
    await page.focus(PRIMARY_INPUT);
    await page.keyboard.press("Alt+ArrowDown");
    await expect(dropdown).toBeVisible();
  });

  test("TP-004 sensitive fields never show suggestions", async ({ page }) => {
    await resetHarness(page);
    const password = page.locator(PASSWORD_INPUT);
    await password.click();
    await password.type("secret");
    const dropdown = page.locator(DROPDOWN_HOST);
    await expect(dropdown).toBeHidden();
  });
});
