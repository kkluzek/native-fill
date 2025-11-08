import { vi } from "vitest";

type StorageChange = {
  oldValue?: unknown;
  newValue?: unknown;
};

type Listener<T extends (...args: any[]) => void> = {
  addListener: (cb: T) => void;
  removeListener: (cb: T) => void;
  emit: (...args: Parameters<T>) => void;
};

const createListener = <T extends (...args: any[]) => void>(): Listener<T> => {
  const fns = new Set<T>();
  return {
    addListener: (cb: T) => {
      fns.add(cb);
    },
    removeListener: (cb: T) => {
      fns.delete(cb);
    },
    emit: (...args: Parameters<T>) => {
      fns.forEach((fn) => fn(...args));
    }
  };
};

const clone = <T>(value: T): T => {
  if (value === undefined || value === null) {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
};

const storageData: Record<string, unknown> = {};

const storageOnChanged = createListener<(changes: Record<string, StorageChange>, area: string) => void>();

const storage = {
  async get(query?: string | string[] | Record<string, unknown>) {
    if (!query) {
      return clone(storageData);
    }
    if (typeof query === "string") {
      return { [query]: clone(storageData[query]) };
    }
    if (Array.isArray(query)) {
      return query.reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = clone(storageData[key]);
        return acc;
      }, {});
    }
    return Object.keys(query).reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = clone(storageData[key]);
      return acc;
    }, {});
  },
  async set(entries: Record<string, unknown>) {
    const changes: Record<string, StorageChange> = {};
    Object.entries(entries).forEach(([key, value]) => {
      changes[key] = {
        oldValue: clone(storageData[key]),
        newValue: clone(value)
      };
      storageData[key] = clone(value);
    });
    if (Object.keys(changes).length) {
      storageOnChanged.emit(changes, "local");
    }
  },
  async clear() {
    Object.keys(storageData).forEach((key) => {
      delete storageData[key];
    });
  },
  async remove(keys: string | string[]) {
    const list = Array.isArray(keys) ? keys : [keys];
    list.forEach((key) => delete storageData[key]);
  }
};

const contextMenusStore = new Map<string, any>();
const contextMenusOnClicked = createListener<(info: any, tab: any) => void>();

const contextMenus = {
  create(options: any) {
    contextMenusStore.set(options.id, options);
  },
  async removeAll() {
    contextMenusStore.clear();
  },
  onClicked: {
    addListener: contextMenusOnClicked.addListener,
    removeListener: contextMenusOnClicked.removeListener
  },
  _emitClick(info: any, tab: any) {
    contextMenusOnClicked.emit(info, tab);
  },
  _store: contextMenusStore
};

const tabs = {
  query: vi.fn(async () => [] as any[]),
  sendMessage: vi.fn(async () => undefined)
};

const runtimeOnMessage = createListener<(message: unknown, sender: unknown, sendResponse: (payload?: unknown) => void) => void>();
const runtimeOnInstalled = createListener<() => void>();

const runtime = {
  onMessage: {
    addListener: runtimeOnMessage.addListener,
    removeListener: runtimeOnMessage.removeListener
  },
  onInstalled: {
    addListener: runtimeOnInstalled.addListener,
    removeListener: runtimeOnInstalled.removeListener
  },
  sendMessage: vi.fn(async () => undefined),
  _emitMessage(message: unknown, sender: unknown) {
    let responded = false;
    runtimeOnMessage.emit(message, sender, (payload?: unknown) => {
      responded = true;
      return payload;
    });
    return responded;
  },
  _emitInstalled() {
    runtimeOnInstalled.emit();
  }
};

const storageApi = {
  local: storage,
  onChanged: {
    addListener: storageOnChanged.addListener,
    removeListener: storageOnChanged.removeListener
  }
};

const browserMock = {
  storage: storageApi,
  tabs,
  contextMenus,
  runtime
};

export const resetBrowserMock = () => {
  Object.keys(storageData).forEach((key) => delete storageData[key]);
  tabs.query.mockReset();
  tabs.sendMessage.mockReset();
  runtime.sendMessage.mockReset();
  contextMenus._store.clear();
};

export const setStorageValue = async (key: string, value: unknown) => {
  await storage.set({ [key]: value });
};

export const getStorageValue = (key: string) => clone(storageData[key]);

export const emitStorageChange = (changes: Record<string, StorageChange>, area: string) => {
  storageOnChanged.emit(changes, area);
};

export default browserMock;
