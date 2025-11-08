import { beforeEach, describe, expect, it, vi } from "vitest";
import browserMock, { getStorageValue, resetBrowserMock, setStorageValue } from "../mocks/browser";
import type { NativeFillItem, NativeFillState } from "../../src/types/data";

vi.mock("webextension-polyfill", () => ({
  default: browserMock
}));

const buildState = (overrides?: Partial<NativeFillState>): NativeFillState => {
  const baseItem: NativeFillItem = {
    id: "item-1",
    label: "Email",
    value: "team@nativefill.dev",
    type: "singleline",
    tags: ["email"],
    aliases: ["work"],
    profile: "Work",
    folder: "Contacts",
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01"
  };

  return {
    items: overrides?.items ?? [baseItem],
    domainRules: overrides?.domainRules ?? [],
    settings:
      overrides?.settings ??
      {
        onboardingCompleted: true,
        shortcuts: {
          openDropdown: "Alt+J",
          forceDropdown: "Alt+ArrowDown"
        },
        theme: "system",
        maxSuggestions: 6
      }
  };
};

describe("UT-002 state helpers (loadState & upsertItem)", () => {
  beforeEach(() => {
    resetBrowserMock();
    vi.resetModules();
  });

  it("seeds default state when storage is empty", async () => {
    const module = await import("../../src/utils/state");
    const state = await module.loadState();
    expect(state.items.length).toBeGreaterThan(0);
    const persisted = getStorageValue(module.stateKey) as NativeFillState | undefined;
    expect(persisted).toBeTruthy();
    expect(browserMock.storage.local).toBeDefined();
  });

  it("deduplicates items by label + value and updates existing entry", async () => {
    const module = await import("../../src/utils/state");
    await setStorageValue(module.stateKey, buildState());

    await module.upsertItem({
      label: "Email",
      value: "team@nativefill.dev",
      folder: "VIP",
      profile: "CX",
      type: "singleline",
      tags: ["vip"],
      aliases: []
    });

    const nextState = getStorageValue(module.stateKey) as NativeFillState;
    expect(nextState.items).toHaveLength(1);
    expect(nextState.items[0].folder).toBe("VIP");
    expect(nextState.items[0].tags).toContain("vip");
  });

  it("creates new items when payload differs", async () => {
    const module = await import("../../src/utils/state");
    await setStorageValue(module.stateKey, buildState());

    await module.upsertItem({
      label: "Address",
      value: "Market St",
      type: "singleline",
      folder: "Logistics",
      profile: "Ops",
      tags: [],
      aliases: []
    });

    const nextState = getStorageValue(module.stateKey) as NativeFillState;
    expect(nextState.items).toHaveLength(2);
    const created = nextState.items.find((item) => item.label === "Address");
    expect(created?.id).toBeTruthy();
    expect(new Date(created!.createdAt).toString()).not.toBe("Invalid Date");
  });
});
