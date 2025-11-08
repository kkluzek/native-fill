import type { NativeFillState } from "../../src/types/data";
import { harnessRuntime } from "./shims/webextension-polyfill";

const networkLog: string[] = [];
const defaultShortcuts = () => ({
  openDropdown: "Alt+J",
  forceDropdown: "Alt+ArrowDown"
});

const createDefaultState = (): NativeFillState => ({
  items: [
    {
      id: "sample-email",
      label: "Konrad — email",
      value: "konrad@example.com",
      type: "singleline",
      tags: ["email", "work"],
      aliases: ["mail"],
      profile: "Work",
      folder: "Contacts",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "sample-address",
      label: "HQ Address",
      value: "1600 Market St, San Francisco, CA",
      type: "multiline",
      tags: ["address"],
      aliases: ["office"],
      profile: "Operations",
      folder: "Logistics",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  domainRules: [],
  settings: {
    onboardingCompleted: true,
    shortcuts: defaultShortcuts(),
    theme: "system",
    maxSuggestions: 6
  }
});

const deepClone = <T>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const dedupeItems = (items: NativeFillState["items"]): NativeFillState["items"] => {
  const map = new Map<string, (typeof items)[number]>();
  items.forEach((item) => {
    const key = `${item.label.trim().toLowerCase()}::${item.value.trim()}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  });
  return Array.from(map.values());
};

const applyState = (state: NativeFillState) => {
  harnessRuntime.setState(state);
  harnessRuntime.broadcast({ type: "nativefill:data", state });
};

const instrumentNetwork = () => {
  if ((window as any).__nativefillNetworkHooked) return;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const [url] = args;
    const target = typeof url === "string" ? url : url.url;
    networkLog.push(target);
    return originalFetch(...(args as Parameters<typeof fetch>));
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (...args) {
    const [, url] = args;
    if (typeof url === "string") {
      networkLog.push(url);
    }
    return originalOpen.apply(this, args as Parameters<typeof originalOpen>);
  };

  (window as any).__nativefillNetworkHooked = true;
};

const ensureApi = () => {
  if ((window as any).nativefillHarness) {
    return (window as any).nativefillHarness as HarnessApi;
  }

  instrumentNetwork();
  const initialState = createDefaultState();
  applyState(initialState);

  const api: HarnessApi = {
    reset() {
      const next = createDefaultState();
      applyState(next);
      this.clearNetworkLog();
    },
    setState(state: NativeFillState) {
      applyState(deepClone(state));
    },
    getState() {
      return deepClone(harnessRuntime.getState());
    },
    broadcast(message: unknown) {
      harnessRuntime.broadcast(message);
    },
    contextFill(itemId: string) {
      const state = harnessRuntime.getState();
      const target = state.items.find((item) => item.id === itemId);
      if (target) {
        harnessRuntime.broadcast({ type: "nativefill:apply-value", value: target.value });
      }
    },
    toggleOverlay(visible: boolean) {
      const overlay = document.querySelector("[data-testid='chrome-overlay']");
      overlay?.toggleAttribute("hidden", !visible);
    },
    exportState() {
      return JSON.stringify(harnessRuntime.getState(), null, 2);
    },
    importState(payload: string) {
      const parsed = JSON.parse(payload) as NativeFillState;
      const next: NativeFillState = {
        ...parsed,
        items: dedupeItems(parsed.items)
      };
      applyState(next);
    },
    getNetworkLog() {
      return [...networkLog];
    },
    clearNetworkLog() {
      networkLog.length = 0;
    }
  };

  (window as any).nativefillHarness = api;
  return api;
};

export const setupHarness = () => ensureApi();

export interface HarnessApi {
  reset(): void;
  setState(state: NativeFillState): void;
  getState(): NativeFillState;
  broadcast(message: unknown): void;
  contextFill(itemId: string): void;
  toggleOverlay(visible: boolean): void;
  exportState(): string;
  importState(payload: string): void;
  getNetworkLog(): string[];
  clearNetworkLog(): void;
}
