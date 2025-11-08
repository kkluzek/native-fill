import { devices, expect, test } from "@playwright/test";

const PRIMARY_INPUT = "[data-testid='primary-input']";
const DROPDOWN_HOST = "#nativefill-dropdown-host";
const PASSWORD_INPUT = "[data-testid='password-input']";
const HARNESS_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";

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

test.describe("MAN-001 Safari macOS parity", () => {
  test.skip(({ browserName }) => browserName !== "webkit", "Requires Safari/WebKit runtime");

  test("dropdown, context menu, and manager flows work in Safari", async ({ page }) => {
    await resetHarness(page);

    const input = page.locator(PRIMARY_INPUT);
    await input.click();
    await input.type("Kon");
    const dropdown = page.locator(DROPDOWN_HOST);
    await expect(dropdown).toHaveAttribute("data-state", "visible");

    await page.evaluate(() => {
      (window as any).nativefillHarness.contextFill("sample-address");
    });
    await expect(input).toHaveValue(/1600 Market St, San Francisco, CA$/);

    await page.keyboard.press("Escape");
    await expect(dropdown).toHaveAttribute("data-state", "hidden");

    const passwordInput = page.locator(PASSWORD_INPUT);
    await passwordInput.click();
    await passwordInput.type("secret");
    await expect(dropdown).not.toBeVisible();

    await page.goto("/options.html");
    await page.waitForSelector("#item-list .nf-list-item");
    await page.fill("input[name='label']", "Safari Automation Item");
    await page.fill("textarea[name='value']", "Autofill from Safari parity test");
    await page.click("#item-form button[type='submit']");
    await page.waitForFunction(() => document.getElementById("live-region")?.textContent?.includes("Zapisano"));

    await page.goto("/");
    await resetHarness(page);
    const shortcuts = await page.evaluate(() => {
      const harness = (window as any).nativefillHarness;
      const state = harness.getState();
      return state.settings.shortcuts;
    });
    expect(shortcuts.openDropdown).toBe("Alt+J");
  });
});

test.describe("MAN-002 Safari iOS parity", () => {
  test.skip(({ browserName }) => browserName !== "webkit", "Requires Safari/WebKit runtime");

  test("activation, dropdown, and manager flows on mobile Safari profile", async ({ browser }) => {
    const iphone = devices["iPhone 13"];
    const context = await browser.newContext({
      ...iphone,
      baseURL: HARNESS_BASE_URL
    });
    const page = await context.newPage();
    await resetHarness(page);

    expect(iphone.viewport?.width).toBeLessThan(500);

    const input = page.locator(PRIMARY_INPUT);
    await input.tap();
    await input.type("HQ");
    const dropdown = page.locator(DROPDOWN_HOST);
    await expect(dropdown).toHaveAttribute("data-state", "visible");

    const overlay = page.locator("[data-testid='chrome-overlay']");
    await expect(overlay).toHaveAttribute("hidden", "");

    await page.evaluate(() => {
      const harness = (window as any).nativefillHarness;
      harness.toggleOverlay(true);
    });
    await expect(overlay).not.toHaveAttribute("hidden", "");

    await page.evaluate(() => {
      const harness = (window as any).nativefillHarness;
      harness.toggleOverlay(false);
      harness.contextFill("sample-email");
    });
    await expect(input).toHaveValue(/konrad@example\.com$/);

    await page.goto("/options.html");
    await page.waitForSelector("#item-list .nf-list-item");
    await page.selectOption("#theme-select", "dark");
    await page.click("button[id='export-data']");
    const ariaLive = await page.locator("#live-region").textContent();
    expect(ariaLive?.toLowerCase()).toContain("wyeksportowano");

    await context.close();
  });
});
