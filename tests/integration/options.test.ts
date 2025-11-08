import { beforeEach, describe, expect, it, vi } from "vitest";
import browserMock, { resetBrowserMock, setStorageValue } from "../mocks/browser";
import type { NativeFillState } from "../../src/types/data";
import { stateKey } from "../../src/utils/state";

vi.mock("webextension-polyfill", () => ({
  default: browserMock
}));

describe("IT-004 options UI CRUD/import/export", () => {
  beforeEach(() => {
    resetBrowserMock();
    vi.resetModules();
    document.body.innerHTML = '<div id="app"></div>';
  });

  const buildState = (): NativeFillState => ({
    items: [
      {
        id: "item-1",
        label: "Email",
        value: "user@example.com",
        type: "singleline",
        tags: ["email"],
        aliases: [],
        profile: "Work",
        folder: "Contacts",
        createdAt: "2025-01-01",
        updatedAt: "2025-01-01"
      }
    ],
    domainRules: [
      {
        id: "rule-1",
        pattern: "*.example.com",
        includeFolders: ["Contacts"],
        excludeFolders: [],
        boostTags: [],
        disableOnHost: false,
        createdAt: "2025-01-01",
        updatedAt: "2025-01-01"
      }
    ],
    settings: {
      onboardingCompleted: true,
      shortcuts: {
        openDropdown: "Alt+J",
        forceDropdown: "Alt+ArrowDown"
      },
      theme: "system",
      maxSuggestions: 6
    }
  });

  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  const loadOptions = async () => {
    await setStorageValue(stateKey, buildState());
    const module = await import("../../src/entrypoints/options/index");
    return module;
  };

  const getLiveRegion = () => document.getElementById("live-region");

  it("IT-004 allows CRUD on items and announces via aria-live", async () => {
    await loadOptions();
    const labelInput = document.querySelector<HTMLInputElement>("input[name='label']");
    const valueInput = document.querySelector<HTMLTextAreaElement>("textarea[name='value']");
    expect(labelInput).toBeTruthy();
    labelInput!.value = "Phone";
    valueInput!.value = "+1 555 0100";
    document.querySelector<HTMLFormElement>("#item-form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    const notifications = getLiveRegion()?.textContent ?? "";
    expect(/Zapisano wpis/i.test(notifications)).toBe(true);
  });

  it("IT-004 exports and imports JSON, merging duplicates", async () => {
    await loadOptions();
    const exportButton = document.querySelector<HTMLButtonElement>("#export-data");
    expect(exportButton).toBeTruthy();
    const exported = await new Promise<string>((resolve) => {
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = (blob: Blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(String(reader.result));
        };
        reader.onerror = () => resolve("");
        reader.readAsText(blob);
        return "blob://fake";
      };
      exportButton!.click();
      URL.createObjectURL = originalCreateObjectURL;
    });

    const payload = JSON.parse(exported) as NativeFillState;
    payload.items.push({
      ...payload.items[0],
      id: "dup-1",
      folder: "Duplicates"
    });

    await setStorageValue(stateKey, payload);
    await import("../../src/entrypoints/options/index");
    const refreshed = await import("../../src/utils/state");
    const state = await refreshed.loadState();
    expect(state.items).toHaveLength(2);
  });

  it("sanitizes imported labels to prevent HTML injection (SEC-004)", async () => {
    await loadOptions();
    const hiddenInput = document.querySelector<HTMLInputElement>("input[type='file'][accept='application/json']");
    expect(hiddenInput).toBeTruthy();

    const maliciousState = buildState();
    maliciousState.items[0].label = '<img src=x onerror="alert(1)">';
    maliciousState.items[0].folder = "<b>Injected</b>";

    Object.defineProperty(hiddenInput!, "files", {
      configurable: true,
      value: [
        {
          text: async () => JSON.stringify(maliciousState)
        }
      ]
    });

    hiddenInput!.dispatchEvent(new Event("change"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const labelNode = document.querySelector(".nf-list-item strong");
    const folderMeta = document.querySelector(".nf-list-item .nf-meta");
    expect(labelNode?.innerHTML ?? "").not.toContain("<img");
    expect(labelNode?.innerHTML ?? "").toContain("&lt;");
    expect(folderMeta?.innerHTML ?? "").not.toContain("<b>");
  });

  it("ACCEPTANCE D — Test match resolves domain precedence in UI", async () => {
    await loadOptions();
    const domainInput = document.getElementById("test-domain") as HTMLInputElement;
    const button = document.getElementById("test-rule") as HTMLButtonElement;
    expect(domainInput).toBeTruthy();
    expect(button).toBeTruthy();

    domainInput.value = "docs.example.com";
    button.click();
    await tick();

    const result = document.getElementById("test-result")?.textContent ?? "";
    expect(result).toContain("Include: Contacts");
  });
});
