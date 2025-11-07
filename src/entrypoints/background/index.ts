import { defineBackground } from "wxt/utils/define-background";
import browser from "webextension-polyfill";
import type { NativeFillMessage } from "@types/messages";
import type { NativeFillItem, NativeFillState } from "@types/data";
import { decodeStateChange, loadState } from "@utils/state";

export default defineBackground(() => {
  if (import.meta.env.SSR) {
    return;
  }

  const CONTEXT_ROOT = "nativefill-root";
  const ITEM_PREFIX = "nativefill-item-";
  const contextMenus = browser.contextMenus;

  let cachedState: NativeFillState;

  const ensureState = async () => {
    if (cachedState) return cachedState;
    cachedState = await loadState();
    return cachedState;
  };

  const supportsContextMenus = Boolean(contextMenus?.create);

  const rebuildContextMenus = async (state: NativeFillState) => {
    if (!supportsContextMenus || typeof contextMenus?.removeAll !== "function") return;
    try {
      await contextMenus.removeAll();
    } catch (error) {
      console.warn("NativeFill: unable to clear context menus", error);
      return;
    }

    contextMenus.create({
      id: CONTEXT_ROOT,
      title: "NativeFill",
      contexts: ["editable"],
      documentUrlPatterns: ["<all_urls>"]
    });

    const folders = new Map<string, NativeFillItem[]>();
    state.items.forEach((item) => {
      const arr = folders.get(item.folder) ?? [];
      arr.push(item);
      folders.set(item.folder, arr);
    });

    folders.forEach((items, folder) => {
      const folderId = `${CONTEXT_ROOT}-${folder}`;
      contextMenus.create({
        id: folderId,
        parentId: CONTEXT_ROOT,
        title: folder,
        contexts: ["editable"],
        documentUrlPatterns: ["<all_urls>"]
      });
      items.forEach((item) => {
        contextMenus.create({
          id: `${ITEM_PREFIX}${item.id}`,
          parentId: folderId,
          title: item.label,
          contexts: ["editable"],
          documentUrlPatterns: ["<all_urls>"]
        });
      });
    });
  };

  const broadcastState = async (state: NativeFillState) => {
    const tabs = await browser.tabs.query({});
    await Promise.all(
      tabs.map((tab) => {
        if (!tab.id) return Promise.resolve();
        return browser.tabs.sendMessage(tab.id, { type: "nativefill:data", state }).catch(() => undefined);
      })
    );
  };

  const initialize = async () => {
    cachedState = await loadState();
    await rebuildContextMenus(cachedState);
  };

  void initialize();

  if (supportsContextMenus && contextMenus?.onClicked?.addListener) {
    contextMenus.onClicked.addListener(async (info, tab) => {
      if (!info.menuItemId || typeof info.menuItemId !== "string") return;
      if (!info.menuItemId.startsWith(ITEM_PREFIX)) return;
      const itemId = info.menuItemId.replace(ITEM_PREFIX, "");
      const state = await ensureState();
      const item = state.items.find((candidate) => candidate.id === itemId);
      if (!item || !tab?.id) return;
      await browser.tabs.sendMessage(tab.id, {
        type: "nativefill:apply-value",
        value: item.value
      });
    });
  }

  browser.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== "local") return;
    const state = decodeStateChange(changes);
    if (!state) return;
    cachedState = state;
    await rebuildContextMenus(state);
    await broadcastState(state);
  });

  browser.runtime.onMessage.addListener((message: NativeFillMessage, _sender, sendResponse) => {
    if (!message || typeof message !== "object") return;
    switch (message.type) {
      case "nativefill:get-state":
        void ensureState().then((state) => sendResponse({ state }));
        return true;
      case "nativefill:context-fill":
        if (!message.itemId) break;
        void (async () => {
          const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
          const state = await ensureState();
          const item = state.items.find((candidate) => candidate.id === message.itemId);
          if (tab?.id && item) {
            await browser.tabs.sendMessage(tab.id, { type: "nativefill:apply-value", value: item.value });
          }
        })();
        break;
      default:
        break;
    }
    return false;
  });

  browser.runtime.onInstalled.addListener(async () => {
    cachedState = await loadState();
    await rebuildContextMenus(cachedState);
  });
});
