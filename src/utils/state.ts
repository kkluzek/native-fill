import browser from "webextension-polyfill";
import { DomainRule, NativeFillItem, NativeFillSettings, NativeFillState } from "@types/data";

const STORAGE_KEY = "nativefill/state";

const nowIso = () => new Date().toISOString();

const defaultShortcuts = () => ({
  openDropdown: "Alt+J",
  forceDropdown: "Alt+ArrowDown"
});

const normalizeLabel = (label: string) => label.trim().toLowerCase();
const normalizeValue = (value: string) => value.trim();

const defaultSettings = (): NativeFillSettings => ({
  onboardingCompleted: false,
  shortcuts: defaultShortcuts(),
  theme: "system",
  maxSuggestions: 6
});

const sampleItems = (): NativeFillItem[] => {
  const base = nowIso();
  return [
    {
      id: crypto.randomUUID(),
      label: "Konrad — email",
      value: "konrad@example.com",
      type: "singleline",
      tags: ["email", "work"],
      aliases: ["mail", "work mail"],
      profile: "Work",
      folder: "Contacts",
      createdAt: base,
      updatedAt: base
    },
    {
      id: crypto.randomUUID(),
      label: "Invoice — company name",
      value: "NativeFill LLC",
      type: "singleline",
      tags: ["invoice", "company"],
      aliases: ["nf company"],
      profile: "Operations",
      folder: "Finance",
      createdAt: base,
      updatedAt: base
    },
    {
      id: crypto.randomUUID(),
      label: "HQ Address",
      value: "1600 Market St, San Francisco, CA",
      type: "multiline",
      tags: ["address", "office"],
      aliases: ["work address"],
      profile: "Work",
      folder: "Logistics",
      createdAt: base,
      updatedAt: base
    }
  ];
};

const sampleRules = (): DomainRule[] => {
  const base = nowIso();
  return [
    {
      id: crypto.randomUUID(),
      pattern: "linkedin.com|*.linkedin.com",
      includeFolders: ["Contacts"],
      excludeFolders: ["Personal"],
      boostTags: ["job", "outreach"],
      disableOnHost: false,
      notes: "Preferuj służbowe dane na LinkedIn",
      createdAt: base,
      updatedAt: base
    }
  ];
};

const defaultState = (): NativeFillState => ({
  items: sampleItems(),
  domainRules: sampleRules(),
  settings: defaultSettings()
});

export const loadState = async (): Promise<NativeFillState> => {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  if (stored[STORAGE_KEY]) {
    return stored[STORAGE_KEY] as NativeFillState;
  }
  const fresh = defaultState();
  await browser.storage.local.set({ [STORAGE_KEY]: fresh });
  return fresh;
};

export const writeState = async (
  updater: (state: NativeFillState) => NativeFillState | void
): Promise<NativeFillState> => {
  const current = await loadState();
  const result = updater(current);
  const nextState = (result ?? current) as NativeFillState;
  await browser.storage.local.set({ [STORAGE_KEY]: nextState });
  return nextState;
};

export const setState = async (state: NativeFillState) => {
  await browser.storage.local.set({ [STORAGE_KEY]: state });
};

export const deleteItem = async (id: string) => {
  await writeState((state) => {
    state.items = state.items.filter((item) => item.id !== id);
    return state;
  });
};

export const upsertItem = async (item: Partial<NativeFillItem> & { value: string; label: string }) => {
  await writeState((state) => {
    const normalizedLabel = normalizeLabel(item.label);
    const normalizedValue = normalizeValue(item.value);
    const existingIndex = state.items.findIndex((i) => i.id === item.id);
    const duplicateIndex = state.items.findIndex((candidate) => {
      if (candidate.id === item.id) {
        return false;
      }
      return normalizeLabel(candidate.label) === normalizedLabel && normalizeValue(candidate.value) === normalizedValue;
    });
    const timestamp = nowIso();
    const targetIndex = existingIndex >= 0 ? existingIndex : duplicateIndex;
    if (targetIndex >= 0) {
      const previous = state.items[targetIndex];
      state.items[targetIndex] = {
        ...previous,
        ...item,
        label: item.label ?? previous.label,
        value: item.value ?? previous.value,
        updatedAt: timestamp
      } as NativeFillItem;
      return state;
    }
    state.items.push({
      id: crypto.randomUUID(),
      type: "singleline",
      tags: [],
      aliases: [],
      profile: "General",
      folder: "General",
      createdAt: timestamp,
      updatedAt: timestamp,
      ...item,
      label: item.label.trim(),
      value: normalizedValue
    } as NativeFillItem);
    return state;
  });
};

export const upsertDomainRule = async (
  rule: Partial<DomainRule> & { pattern: string }
) => {
  await writeState((state) => {
    const timestamp = nowIso();
    const existingIndex = state.domainRules.findIndex((r) => r.id === rule.id);
    if (existingIndex >= 0) {
      state.domainRules[existingIndex] = {
        ...state.domainRules[existingIndex],
        ...rule,
        updatedAt: timestamp
      } as DomainRule;
      return state;
    }
    state.domainRules.push({
      id: crypto.randomUUID(),
      includeFolders: [],
      excludeFolders: [],
      boostTags: [],
      disableOnHost: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...rule
    } as DomainRule);
    return state;
  });
};

export const deleteDomainRule = async (id: string) => {
  await writeState((state) => {
    state.domainRules = state.domainRules.filter((rule) => rule.id !== id);
    return state;
  });
};

export const updateSettings = async (settings: Partial<NativeFillSettings>) => {
  await writeState((state) => {
    state.settings = { ...state.settings, ...settings };
    return state;
  });
};

export const decodeStateChange = (
  changes: Record<string, browser.Storage.StorageChange>
): NativeFillState | null => {
  if (STORAGE_KEY in changes) {
    return changes[STORAGE_KEY].newValue as NativeFillState;
  }
  return null;
};

export const stateKey = STORAGE_KEY;
