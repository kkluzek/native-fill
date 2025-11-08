import "./style.css";
import type { NativeFillState } from "../../src/types/data";
import contentScript from "../../src/entrypoints/content";
import { harnessRuntime } from "./shims/webextension-polyfill";

const clone = <T>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

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
    shortcuts: {
      openDropdown: "Alt+J",
      forceDropdown: "Alt+ArrowDown"
    },
    theme: "system",
    maxSuggestions: 6
  }
});

const applyState = (state: NativeFillState) => {
  harnessRuntime.setState(state);
  harnessRuntime.broadcast({ type: "nativefill:data", state });
};

const clearInputs = () => {
  const primary = document.querySelector<HTMLInputElement>("[data-testid='primary-input']");
  const notes = document.querySelector<HTMLTextAreaElement>("[data-testid='notes-field']");
  const password = document.querySelector<HTMLInputElement>("[data-testid='password-input']");
  if (primary) primary.value = "";
  if (notes) notes.value = "";
  if (password) password.value = "";
};

const toggleOverlay = (visible: boolean) => {
  const overlay = document.querySelector("[data-testid='chrome-overlay']");
  if (overlay) {
    overlay.toggleAttribute("hidden", !visible);
  }
};

const bootState = createDefaultState();
applyState(bootState);
contentScript.main();

interface HarnessApi {
  reset(): void;
  setState(state: NativeFillState): void;
  getState(): NativeFillState;
  broadcast(message: unknown): void;
  contextFill(itemId: string): void;
  toggleOverlay(visible: boolean): void;
}

declare global {
  interface Window {
    nativefillHarness: HarnessApi;
  }
}

window.nativefillHarness = {
  reset() {
    const next = createDefaultState();
    applyState(next);
    clearInputs();
    toggleOverlay(false);
  },
  setState(state: NativeFillState) {
    applyState(clone(state));
  },
  getState() {
    return clone(harnessRuntime.getState());
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
  toggleOverlay
};
