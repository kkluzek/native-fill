import { beforeEach, describe, expect, it, vi } from "vitest";
import browserMock, { resetBrowserMock } from "../mocks/browser";
import type { NativeFillState } from "../../src/types/data";

const registeredScripts: any[] = [];

vi.mock("webextension-polyfill", () => ({
  default: browserMock
}));

vi.mock("wxt/utils/define-content-script", () => ({
  defineContentScript: (config: any) => {
    registeredScripts.push(config);
    return config;
  }
}));

const rankMock = vi.fn(() => []);
vi.mock("@utils/fuzzy", () => ({
  fuzzyEngine: {
    init: vi.fn(async () => undefined),
    rank: rankMock
  }
}));

vi.mock("@utils/domain", () => ({
  resolveDomainRules: vi.fn(() => ({
    disable: false,
    includeFolders: new Set<string>(),
    excludeFolders: new Set<string>(),
    boostTags: new Set<string>()
  }))
}));

describe("content script DOM behaviour", () => {
  beforeEach(() => {
    resetBrowserMock();
    registeredScripts.length = 0;
    rankMock.mockReset();
    browserMock.runtime.sendMessage.mockReset();
    document.body.innerHTML = "";
    vi.resetModules();
  });

  const loadContentScript = async () => {
    await import("../../src/entrypoints/content/index");
    const script = registeredScripts.at(-1);
    if (!script) {
      throw new Error("content script not registered");
    }
    return script;
  };

  const sampleState: NativeFillState = {
    items: [
      {
        id: "item-1",
        label: "Konrad",
        value: "konrad@example.com",
        type: "singleline",
        tags: [],
        aliases: [],
        profile: "Work",
        folder: "Contacts",
        createdAt: "2025-01-01",
        updatedAt: "2025-01-01"
      }
    ],
    domainRules: [],
    settings: {
      onboardingCompleted: true,
      shortcuts: {
        openDropdown: "Alt+J",
        forceDropdown: "Alt+ArrowDown"
      },
      theme: "system",
      maxSuggestions: 6
    }
  };

  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("shows dropdown for fillable inputs", async () => {
    browserMock.runtime.sendMessage.mockResolvedValue({ state: sampleState });
    rankMock.mockReturnValue([
      {
        item: sampleState.items[0],
        score: 1,
        highlightedLabel: "<mark>Kon</mark>rad"
      }
    ]);

    const script = await loadContentScript();
    script.main();

    const input = document.createElement("input");
    input.type = "text";
    document.body.append(input);
    input.value = "Kon";

    const focusEvent = new FocusEvent("focusin", { bubbles: true });
    Object.defineProperty(focusEvent, "target", { value: input, configurable: true });
    document.dispatchEvent(focusEvent);

    const inputEvent = new Event("input", { bubbles: true });
    Object.defineProperty(inputEvent, "target", { value: input, configurable: true });
    document.dispatchEvent(inputEvent);

    await tick();

    const host = document.getElementById("nativefill-dropdown-host");
    expect(rankMock).toHaveBeenCalled();
    expect(host?.style.display).toBe("block");
  });

  it("keeps dropdown hidden for sensitive fields", async () => {
    browserMock.runtime.sendMessage.mockResolvedValue({ state: sampleState });
    rankMock.mockReturnValue([]);

    const script = await loadContentScript();
    script.main();

    const input = document.createElement("input");
    input.type = "password";
    input.name = "userPassword";
    document.body.append(input);

    const focusEvent = new FocusEvent("focusin", { bubbles: true });
    Object.defineProperty(focusEvent, "target", { value: input, configurable: true });
    document.dispatchEvent(focusEvent);

    const inputEvent = new Event("input", { bubbles: true });
    Object.defineProperty(inputEvent, "target", { value: input, configurable: true });
    document.dispatchEvent(inputEvent);

    await tick();

    const host = document.getElementById("nativefill-dropdown-host");
    expect(rankMock).not.toHaveBeenCalled();
    expect(host?.style.display).toBe("none");
  });
});
