import { beforeEach, describe, expect, it, vi } from "vitest";
import browserMock, { resetBrowserMock } from "../mocks/browser";
import type { NativeFillItem, NativeFillState } from "../../src/types/data";

vi.mock("webextension-polyfill", () => ({
  default: browserMock
}));

vi.mock("@styles/popup.css?inline", () => ({ default: "" }));

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

const buildState = (): NativeFillState => ({
  items: [
    {
      id: "item-1",
      label: "Konrad — email",
      value: "konrad@example.com",
      type: "singleline",
      tags: ["email"],
      aliases: ["mail"],
      profile: "Work",
      folder: "Contacts",
      createdAt: "2025-01-01",
      updatedAt: "2025-01-01"
    },
    {
      id: "item-2",
      label: "Invoice — company name",
      value: "NativeFill LLC",
      type: "singleline",
      tags: ["invoice"],
      aliases: ["company"],
      profile: "Ops",
      folder: "Finance",
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
});

describe("IT-005 popup integration", () => {
  beforeEach(() => {
    resetBrowserMock();
    vi.resetModules();
    document.body.innerHTML = `
      <div id="popup-app" class="nf-popup">
        <header>
          <button id="open-options">⚙️</button>
        </header>
        <input id="popup-search" />
        <div id="popup-list"></div>
        <footer><span id="popup-count"></span></footer>
      </div>
    `;
  });

  it("filters list and sends selected item to the active tab (IT-005)", async () => {
    const sampleState = buildState();
    browserMock.runtime.sendMessage.mockResolvedValue({ state: sampleState });
    browserMock.tabs.query.mockResolvedValue([{ id: 42 } as any]);
    browserMock.tabs.sendMessage.mockResolvedValue(undefined);
    const closeSpy = vi.spyOn(window, "close").mockImplementation(() => undefined);

    const fuzzyModule = await import("../../src/utils/fuzzy");
    vi.spyOn(fuzzyModule.fuzzyEngine, "init").mockResolvedValue(undefined);
    vi.spyOn(fuzzyModule.fuzzyEngine, "rank").mockImplementation((term: string, items: NativeFillItem[]) => {
      const normalized = term.toLowerCase();
      return items
        .filter((item) => item.label.toLowerCase().includes(normalized))
        .map((item) => ({
          item,
          score: 1,
          highlightedLabel: item.label.replace(new RegExp(term, "i"), `<mark>${term}</mark>`)
        }));
    });

    await import("../../src/entrypoints/popup/index");

    expect(browserMock.runtime.sendMessage).toHaveBeenCalledWith({ type: "nativefill:get-state" });
    expect(document.getElementById("popup-count")?.textContent).toBe("2 wpisów");

    const searchInput = document.getElementById("popup-search") as HTMLInputElement;
    searchInput.value = "invoice";
    searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    await flushMicrotasks();

    const rendered = document.querySelectorAll("#popup-list .popup-item");
    expect(rendered).toHaveLength(1);
    expect(rendered[0].querySelector("strong")?.textContent).toContain("Invoice");

    (rendered[0] as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushMicrotasks();
    expect(browserMock.tabs.sendMessage).toHaveBeenCalledWith(42, {
      type: "nativefill:apply-value",
      value: "NativeFill LLC"
    });

    closeSpy.mockRestore();
  });
});

describe("IT-006 fuzzy engine fallback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to TS scoring when WASM fails to load (IT-006)", async () => {
    const fetchStub = vi.spyOn(globalThis, "fetch" as any).mockImplementation(async () => {
      throw new Error("network blocked");
    });
    const instantiateStub = vi
      .spyOn(WebAssembly, "instantiate")
      .mockRejectedValue(new Error("wasm unsupported"));

    const { fuzzyEngine } = await import("../../src/utils/fuzzy");
    await expect(fuzzyEngine.init()).resolves.not.toThrow();
    const items = buildState().items;
    const ranked = fuzzyEngine.rank("kon", items);
    expect(ranked.length).toBeGreaterThan(0);
    expect((window as any).__nativefillWasmMode).toBe("fallback");

    fetchStub.mockRestore();
    instantiateStub.mockRestore();
  });
});
