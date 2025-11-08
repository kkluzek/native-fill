import type { NativeFillState } from "../../../src/types/data";

type MessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (payload?: unknown) => void
) => boolean | void;

const STORAGE_KEY = "nativefill/state";

const deepClone = <T>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

let harnessState: NativeFillState | null = null;
const storageData: Record<string, unknown> = {};
const messageListeners = new Set<MessageListener>();

const runtime = {
  onMessage: {
    addListener(listener: MessageListener) {
      messageListeners.add(listener);
    },
    removeListener(listener: MessageListener) {
      messageListeners.delete(listener);
    }
  },
  async sendMessage(message: any) {
    if (message?.type === "nativefill:get-state") {
      if (!harnessState) {
        throw new Error("Harness state not initialized");
      }
      return { state: harnessState };
    }
    return undefined;
  }
};

const storage = {
  local: {
    async get(query?: string | string[] | Record<string, unknown>) {
      if (!query) {
        return deepClone(storageData);
      }
      if (typeof query === "string") {
        return { [query]: deepClone(storageData[query]) };
      }
      if (Array.isArray(query)) {
        return query.reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = deepClone(storageData[key]);
          return acc;
        }, {});
      }
      return Object.keys(query).reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = deepClone(storageData[key]);
        return acc;
      }, {});
    },
    async set(entries: Record<string, unknown>) {
      Object.entries(entries).forEach(([key, value]) => {
        storageData[key] = deepClone(value);
        if (key === STORAGE_KEY) {
          harnessState = deepClone(value as NativeFillState);
        }
      });
    }
  },
  onChanged: {
    addListener() {
      /* noop */
    },
    removeListener() {
      /* noop */
    }
  }
};

const browserShim = {
  runtime,
  storage,
  tabs: {
    async sendMessage() {
      return undefined;
    },
    async query() {
      return [];
    }
  },
  contextMenus: {
    onClicked: {
      addListener() {},
      removeListener() {}
    },
    create() {},
    async removeAll() {}
  }
};

export default browserShim;

export const harnessRuntime = {
  setState(state: NativeFillState) {
    harnessState = deepClone(state);
    storageData[STORAGE_KEY] = deepClone(state);
  },
  getState(): NativeFillState {
    if (!harnessState) {
      throw new Error("Harness state not initialized");
    }
    return deepClone(harnessState);
  },
  broadcast(message: unknown) {
    messageListeners.forEach((listener) => {
      try {
        listener(message, { tab: { id: 1 } }, () => undefined);
      } catch (error) {
        console.error("Harness runtime listener error", error);
      }
    });
  }
};
