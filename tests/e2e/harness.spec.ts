/**
 * @file E2E Harness Tests (TP-001 to TP-012)
 * @acceptance-criteria B, C, D, E, G
 *
 * ACCEPTANCE B: UX "native-like"
 * - Dropdown appears ≤150ms after typing
 * - Arrow keys, Enter, Esc navigation
 * - Shadow DOM prevents style conflicts
 * - ARIA announces suggestion counts
 *
 * ACCEPTANCE C: Data & Storage
 * - storage.local only (no sync/cloud backup)
 * - Import/export JSON with deduplication by label+hash(value)
 * - No network requests for storage operations
 *
 * ACCEPTANCE D: Domain Rules
 * - Precedence: exact > *.domain > *.*.domain > global
 * - "Disable on host" hides dropdown/context menu
 * - CRUD editor with "Test match" feature
 *
 * ACCEPTANCE E: WASM Fuzzy
 * - initWasm() ≤100ms (warm cache)
 * - match() ≤3ms for 5k items
 * - Fallback to TypeScript without errors
 *
 * ACCEPTANCE G: Performance
 * - Render list ≤4ms
 * - No long tasks >50ms in content script
 * - Bundle <250KB gzipped
 */

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

  test("TP-005 import/export round-trip deduplicates entries", async ({ page }) => {
    await resetHarness(page);
    const exported = await page.evaluate(() => (window as any).nativefillHarness.exportState());
    const result = await page.evaluate((payload) => {
      const harness = (window as any).nativefillHarness;
      const data = JSON.parse(payload);
      data.items.push({
        ...data.items[0],
        id: "duplicate-item",
        folder: "Duplicates"
      });
      harness.reset();
      harness.importState(JSON.stringify(data));
      const state = harness.getState();
      return {
        count: state.items.length,
        folders: state.items.map((item: any) => item.folder)
      };
    }, exported);

    expect(result.count).toBe(2);
    expect(new Set(result.folders)).not.toContain("Duplicates");
  });

  test("TP-006 offline storage only (no network requests)", async ({ page }) => {
    await resetHarness(page);
    await page.evaluate(() => {
      (window as any).nativefillHarness.clearNetworkLog();
    });
    const input = page.locator(PRIMARY_INPUT);
    await input.click();
    await input.type("Kon");
    await page.keyboard.press("Enter");
    await page.evaluate(() => {
      const harness = (window as any).nativefillHarness;
      const exported = harness.exportState();
      harness.importState(exported);
    });
    const networkEvents = await page.evaluate(() => (window as any).nativefillHarness.getNetworkLog());
    expect(networkEvents).toHaveLength(0);
  });

  test("TP-009 WASM init and fallback handling", async ({ page }) => {
    await resetHarness(page);
    await page.evaluate(() => {
      (window as any).nativefillHarness.setWasmBlocked(false);
    });
    await resetHarness(page);
    const input = page.locator(PRIMARY_INPUT);
    await input.click();
    await input.type("kon");
    await page.waitForFunction(() => (window as any).__nativefillWasmMode === "wasm");

    await page.evaluate(() => {
      (window as any).nativefillHarness.setWasmBlocked(true);
    });
    await resetHarness(page);
    const fallbackInput = page.locator(PRIMARY_INPUT);
    await fallbackInput.click();
    await fallbackInput.type("kon");
    await page.waitForTimeout(200);
    const mode = await page.evaluate(() => (window as any).__nativefillWasmMode);
    expect(mode).toBe("fallback");
  });

  test("TP-010 Shadow DOM isolation from host styles", async ({ page }) => {
    await resetHarness(page);
    await page.addStyleTag({ content: "ul { display: none !important; }" });
    const input = page.locator(PRIMARY_INPUT);
    await input.click();
    await input.type("kon");
    await expect(page.locator(DROPDOWN_HOST)).toHaveAttribute("data-state", "visible");
  });

  test("TP-011 Shortcut remap propagates to the content script", async ({ page }) => {
    await page.goto("/options.html");
    await page.waitForSelector("#item-list .nf-list-item");
    await page.fill("input#shortcut-open", "Alt+X");
    await page.fill("input#shortcut-force", "Alt+Y");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);
    await page.goto("/");
    const input = page.locator(PRIMARY_INPUT);
    await input.click();
    await page.keyboard.press("Alt+X");
    await expect(page.locator(DROPDOWN_HOST)).toHaveAttribute("data-state", "visible");
  });

  test("TP-012 Broadcast updates all tabs", async ({ browser }) => {
    const context = await browser.newContext();
    const pageA = await context.newPage();
    const pageB = await context.newPage();
    await pageA.goto("/");
    await pageB.goto("/");
    await pageA.evaluate(() => {
      const harness = (window as any).nativefillHarness;
      const detach = harness.attachTabChannel((message: any) => {
        (window as any).__broadcastCapture = message?.state?.items?.[0]?.label ?? "";
      });
      (window as any).__detachBroadcast = detach;
    });
    await pageB.evaluate(() => {
      const harness = (window as any).nativefillHarness;
      const state = harness.getState();
      state.items[0].label = "Updated Email";
      harness.setState(state);
      harness.broadcast({ type: "nativefill:data", state });
    });
    await pageA.waitForTimeout(200);
    const updatedLabel = await pageA.evaluate(() => (window as any).__broadcastCapture ?? "");
    expect(updatedLabel).toBe("Updated Email");
    await pageA.evaluate(() => {
      (window as any).__detachBroadcast?.();
    });
    await context.close();
  });

  test("TP-007 Options live region and focus retention", async ({ page }) => {
    await page.goto("/options.html");
    await page.waitForSelector("#item-list .nf-list-item");
    const label = page.locator("input[name='label']");
    const value = page.locator("textarea[name='value']");
    await label.fill("Harness Item");
    await value.fill("Some value");
    const saveButton = page.locator("#item-form button[type='submit']");
    await saveButton.click();
    await page.waitForFunction(() => {
      return document.getElementById("live-region")?.textContent?.includes("Zapisano") ?? false;
    });
    const activeRole = await page.evaluate(() => document.activeElement?.textContent ?? "");
    expect(activeRole).toMatch(/Save/i);
  });

  test("TP-008 Domain rule disable hides dropdown", async ({ page }) => {
    await resetHarness(page);
    await page.evaluate(() => {
      const harness = (window as any).nativefillHarness;
      const state = harness.getState();
      state.domainRules.push({
        id: "disable-local",
        pattern: "*",
        includeFolders: [],
        excludeFolders: [],
        boostTags: [],
        disableOnHost: true,
        notes: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      harness.setState(state);
    });
    await page.waitForTimeout(200);
    const input = page.locator(PRIMARY_INPUT);
    await input.click();
    await input.type("Test");
    await page.waitForTimeout(200);
    const dropdown = page.locator(DROPDOWN_HOST);
    await expect(dropdown).toHaveAttribute("data-state", "disabled");
  });
});
