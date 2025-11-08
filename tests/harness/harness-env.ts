import type { NativeFillState } from "../../src/types/data";
import { harnessRuntime } from "./shims/webextension-polyfill";

const networkLog: string[] = [];
const WASM_BLOCK_KEY = "__nativefillBlockWasm";
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
  if (typeof (window as any).__nativefillBlockWasm === "undefined") {
    const stored = window.sessionStorage.getItem(WASM_BLOCK_KEY);
    (window as any).__nativefillBlockWasm = stored === "true";
  }
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const [url] = args;
    const target = typeof url === "string" ? url : url.url;
    networkLog.push(target);
    if ((window as any).__nativefillBlockWasm && target.includes(".wasm")) {
      throw new Error("Harness blocked WASM load");
    }
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
  const channel = new BroadcastChannel("nativefill-harness");
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
      this.__attachedTabs.forEach((tab) => tab(message));
      channel.postMessage(message);
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
    },
    setWasmBlocked(blocked: boolean) {
      (window as any).__nativefillBlockWasm = blocked;
      window.sessionStorage.setItem(WASM_BLOCK_KEY, String(blocked));
    },
    attachTabChannel(handler: (message: unknown) => void) {
      const listener = (event: MessageEvent) => handler(event.data);
      channel.addEventListener("message", listener);
      this.__attachedTabs.add(handler);
      return () => {
        this.__attachedTabs.delete(handler);
        channel.removeEventListener("message", listener);
      };
    },
    __attachedTabs: new Set<(message: unknown) => void>()
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
  setWasmBlocked(blocked: boolean): void;
}
