import type { NativeFillState } from "../../../src/types/data";

type MessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (payload?: unknown) => void
) => boolean | void;

const deepClone = <T>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

let harnessState: NativeFillState | null = null;
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
