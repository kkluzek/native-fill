import { beforeEach, describe, expect, it, vi } from "vitest";
import browserMock, { emitStorageChange, resetBrowserMock, setStorageValue } from "../mocks/browser";
import type { NativeFillState } from "../../src/types/data";
import { stateKey } from "../../src/utils/state";

vi.mock("webextension-polyfill", () => ({
  default: browserMock
}));

vi.mock("wxt/utils/define-background", () => ({
  defineBackground: (handler: () => void) => handler
}));

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("IT-001/IT-002 background service worker", () => {
  beforeEach(() => {
    resetBrowserMock();
    vi.resetModules();
  });

  const loadBackground = async () => {
    const module = await import("../../src/entrypoints/background/index");
    const runner = module.default as () => void;
    runner();
  };

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
    domainRules: [],
    settings: {
      onboardingCompleted: true,
      shortcuts: {
        openDropdown: "Alt+J",
        forceDropdown: "Alt+ArrowDown"
      },
      theme: "system",
      maxSuggestions: 5
    }
  });

  it("IT-001 rebuilds context menus and broadcasts on storage changes", async () => {
    const initialState = buildState();
    await setStorageValue(stateKey, initialState);
    browserMock.tabs.query.mockResolvedValue([{ id: 42 } as any]);

    await loadBackground();

    const updatedState: NativeFillState = {
      ...initialState,
      items: [
        {
          ...initialState.items[0],
          id: "item-2",
          label: "Phone",
          value: "+1 555 0100",
          folder: "General"
        }
      ]
    };

    emitStorageChange({
      [stateKey]: {
        oldValue: initialState,
        newValue: updatedState
      }
    }, "local");

    await tick();

    expect(browserMock.contextMenus._store.has("nativefill-root")).toBe(true);
    expect([...browserMock.contextMenus._store.keys()]).toContain("nativefill-root-General");
    expect(browserMock.tabs.sendMessage).toHaveBeenCalledWith(42, {
      type: "nativefill:data",
      state: updatedState
    });
  });

  it("IT-002 fills active tab when context menu item is clicked", async () => {
    const state = buildState();
    await setStorageValue(stateKey, state);
    await loadBackground();

    browserMock.tabs.sendMessage.mockResolvedValue(undefined);

    browserMock.contextMenus._emitClick(
      {
        menuItemId: `nativefill-item-${state.items[0].id}`
      },
      { id: 99 }
    );

    await tick();

    expect(browserMock.tabs.sendMessage).toHaveBeenCalledWith(99, {
      type: "nativefill:apply-value",
      value: state.items[0].value
    });
  });
});
