import browser from "webextension-polyfill";
import type { DomainRule, NativeFillItem, NativeFillState } from "@types/data";
import {
  deleteDomainRule,
  deleteItem,
  loadState,
  stateKey,
  updateSettings,
  upsertDomainRule,
  upsertItem
} from "@utils/state";
import { resolveDomainRules } from "@utils/domain";
import optionsStyles from "@styles/options.css?inline";

const style = document.createElement("style");
style.textContent = optionsStyles;
document.head.appendChild(style);

const app = document.getElementById("app");
if (!app) {
  throw new Error("NativeFill options: app root not found");
}

app.innerHTML = `
  <div id="live-region" class="sr-only" aria-live="polite"></div>
  <section id="data-section">
    <div class="nf-inline" style="justify-content: space-between; align-items: flex-start;">
      <div>
        <h2>Data</h2>
        <p>Foldery, profile, tagi i aliasy — pełna kontrola nad wpisami.</p>
      </div>
      <div class="nf-toolbar">
        <button type="button" id="export-data">Export JSON</button>
        <button type="button" id="import-data" class="secondary">Import JSON</button>
      </div>
    </div>
    <div class="nf-grid">
      <div>
        <div id="item-list" class="nf-list"></div>
      </div>
      <form id="item-form" class="nf-grid" autocomplete="off">
        <input type="hidden" name="id" />
        <label>Label
          <input name="label" required />
        </label>
        <label>Value
          <textarea name="value" required></textarea>
        </label>
        <label>Folder
          <input name="folder" placeholder="np. Contacts" />
        </label>
        <label>Profile
          <input name="profile" placeholder="np. Work" />
        </label>
        <label>Tags (comma)
          <input name="tags" placeholder="email, outreach" />
        </label>
        <label>Aliases (comma)
          <input name="aliases" placeholder="work email" />
        </label>
        <label>Type
          <select name="type">
            <option value="singleline">Single-line</option>
            <option value="multiline">Multiline</option>
          </select>
        </label>
        <div class="nf-toolbar">
          <button type="submit">Save</button>
          <button type="button" class="secondary" id="clear-item">Clear</button>
          <button type="button" class="secondary" id="delete-item" disabled>Delete</button>
        </div>
      </form>
    </div>
  </section>
  <section id="rules-section">
    <div class="nf-inline" style="justify-content: space-between; align-items: flex-start;">
      <div>
        <h2>Domain Rules</h2>
        <p>Boostuj, filtruj i wyłączaj sugestie per host.</p>
      </div>
      <div class="nf-inline">
        <input type="text" id="test-domain" placeholder="host do testu" />
        <button type="button" id="test-rule">Test match</button>
        <span id="test-result" class="badge"></span>
      </div>
    </div>
    <div class="nf-grid">
      <div>
        <div id="rule-list" class="nf-list"></div>
      </div>
      <form id="rule-form" class="nf-grid" autocomplete="off">
        <input type="hidden" name="id" />
        <label>Pattern (use | for variants)
          <input name="pattern" placeholder="linkedin.com|*.linkedin.com" required />
        </label>
        <label>Include folders
          <input name="includeFolders" placeholder="Work, Outreach" />
        </label>
        <label>Exclude folders
          <input name="excludeFolders" placeholder="Personal" />
        </label>
        <label>Boost tags
          <input name="boostTags" placeholder="job, outreach" />
        </label>
        <label class="nf-inline">
          <input type="checkbox" name="disableOnHost" /> Disable on this host
        </label>
        <label>Notes
          <textarea name="notes" placeholder="Dlaczego ta reguła istnieje?"></textarea>
        </label>
        <div class="nf-toolbar">
          <button type="submit">Save rule</button>
          <button type="button" class="secondary" id="clear-rule">Clear</button>
          <button type="button" class="secondary" id="delete-rule" disabled>Delete</button>
        </div>
      </form>
    </div>
  </section>
  <section id="settings-section">
    <h2>Behavior</h2>
    <div class="nf-grid">
      <label>Max suggestions
        <input type="number" id="max-suggestions" min="1" max="10" />
      </label>
      <label>Theme
        <select id="theme-select">
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <label>Shortcut — open dropdown
        <input type="text" id="shortcut-open" />
      </label>
      <label>Shortcut — force dropdown
        <input type="text" id="shortcut-force" />
      </label>
    </div>
  </section>
`;

const liveRegion = document.getElementById("live-region");
const itemList = document.getElementById("item-list");
const ruleList = document.getElementById("rule-list");
const itemForm = document.getElementById("item-form") as HTMLFormElement;
const ruleForm = document.getElementById("rule-form") as HTMLFormElement;
const deleteItemBtn = document.getElementById("delete-item") as HTMLButtonElement;
const deleteRuleBtn = document.getElementById("delete-rule") as HTMLButtonElement;
const maxSuggestionsInput = document.getElementById("max-suggestions") as HTMLInputElement;
const themeSelect = document.getElementById("theme-select") as HTMLSelectElement;
const shortcutOpenInput = document.getElementById("shortcut-open") as HTMLInputElement;
const shortcutForceInput = document.getElementById("shortcut-force") as HTMLInputElement;
const exportBtn = document.getElementById("export-data") as HTMLButtonElement;
const importBtn = document.getElementById("import-data") as HTMLButtonElement;
const testDomainInput = document.getElementById("test-domain") as HTMLInputElement;
const testResult = document.getElementById("test-result");

const hiddenImport = document.createElement("input");
hiddenImport.type = "file";
hiddenImport.accept = "application/json";
hiddenImport.style.display = "none";
app.append(hiddenImport);

let state: NativeFillState;
let selectedItemId: string | null = null;
let selectedRuleId: string | null = null;

const speak = (message: string) => {
  if (liveRegion) {
    liveRegion.textContent = message;
  }
};

const parseCsv = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const refreshState = async () => {
  state = await loadState();
  renderItems();
  renderRules();
  renderSettings();
};

const renderItems = () => {
  if (!itemList) return;
  if (!state.items.length) {
    itemList.innerHTML = '<div class="nf-list-item">Brak danych — dodaj pierwszy wpis.</div>';
    return;
  }
  itemList.innerHTML = state.items
    .map((item) => {
      const activeClass = item.id === selectedItemId ? "active" : "";
      return `<div class="nf-list-item ${activeClass}" data-id="${item.id}">
        <div>
          <strong>${item.label}</strong>
          <div class="nf-meta">${item.folder} · ${item.profile}</div>
        </div>
        <span class="badge">${item.type}</span>
      </div>`;
    })
    .join("");
};

const renderRules = () => {
  if (!ruleList) return;
  if (!state.domainRules.length) {
    ruleList.innerHTML = '<div class="nf-list-item">Brak reguł domenowych.</div>';
    return;
  }
  ruleList.innerHTML = state.domainRules
    .map((rule) => {
      const activeClass = rule.id === selectedRuleId ? "active" : "";
      return `<div class="nf-list-item ${activeClass}" data-id="${rule.id}">
        <div>
          <strong>${rule.pattern}</strong>
          <div class="nf-meta">Include: ${rule.includeFolders.join(", ") || "-"}</div>
        </div>
        <span class="badge">${rule.disableOnHost ? "OFF" : "ON"}</span>
      </div>`;
    })
    .join("");
};

const renderSettings = () => {
  maxSuggestionsInput.value = String(state.settings.maxSuggestions);
  themeSelect.value = state.settings.theme;
  shortcutOpenInput.value = state.settings.shortcuts.openDropdown;
  shortcutForceInput.value = state.settings.shortcuts.forceDropdown;
};

itemList?.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>(".nf-list-item");
  if (!target) return;
  selectedItemId = target.dataset.id ?? null;
  const item = state.items.find((entry) => entry.id === selectedItemId);
  if (!item) return;
  (itemForm.elements.namedItem("id") as HTMLInputElement).value = item.id;
  (itemForm.elements.namedItem("label") as HTMLInputElement).value = item.label;
  (itemForm.elements.namedItem("value") as HTMLTextAreaElement).value = item.value;
  (itemForm.elements.namedItem("folder") as HTMLInputElement).value = item.folder;
  (itemForm.elements.namedItem("profile") as HTMLInputElement).value = item.profile;
  (itemForm.elements.namedItem("tags") as HTMLInputElement).value = item.tags.join(", ");
  (itemForm.elements.namedItem("aliases") as HTMLInputElement).value = item.aliases.join(", ");
  (itemForm.elements.namedItem("type") as HTMLSelectElement).value = item.type;
  deleteItemBtn.disabled = false;
  renderItems();
});

ruleList?.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>(".nf-list-item");
  if (!target) return;
  selectedRuleId = target.dataset.id ?? null;
  const rule = state.domainRules.find((entry) => entry.id === selectedRuleId);
  if (!rule) return;
  (ruleForm.elements.namedItem("id") as HTMLInputElement).value = rule.id;
  (ruleForm.elements.namedItem("pattern") as HTMLInputElement).value = rule.pattern;
  (ruleForm.elements.namedItem("includeFolders") as HTMLInputElement).value = rule.includeFolders.join(", ");
  (ruleForm.elements.namedItem("excludeFolders") as HTMLInputElement).value = rule.excludeFolders.join(", ");
  (ruleForm.elements.namedItem("boostTags") as HTMLInputElement).value = rule.boostTags.join(", ");
  (ruleForm.elements.namedItem("notes") as HTMLTextAreaElement).value = rule.notes ?? "";
  (ruleForm.elements.namedItem("disableOnHost") as HTMLInputElement).checked = rule.disableOnHost;
  deleteRuleBtn.disabled = false;
  renderRules();
});

itemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(itemForm);
  const payload: Partial<NativeFillItem> & { label: string; value: string } = {
    id: (formData.get("id") as string) || undefined,
    label: (formData.get("label") as string).trim(),
    value: (formData.get("value") as string).trim(),
    folder: (formData.get("folder") as string).trim() || "General",
    profile: (formData.get("profile") as string).trim() || "General",
    tags: parseCsv((formData.get("tags") as string) || ""),
    aliases: parseCsv((formData.get("aliases") as string) || ""),
    type: (formData.get("type") as "singleline" | "multiline") || "singleline"
  };
  if (!payload.label || !payload.value) {
    speak("Label i Value są wymagane");
    return;
  }
  const duplicate = state.items.find(
    (item) =>
      item.label.trim().toLowerCase() === payload.label.toLowerCase() &&
      item.value.trim() === payload.value
  );
  if (duplicate && !payload.id) {
    payload.id = duplicate.id;
  }
  await upsertItem(payload);
  speak("Zapisano wpis");
  itemForm.reset();
  deleteItemBtn.disabled = true;
  selectedItemId = null;
  await refreshState();
});

document.getElementById("clear-item")?.addEventListener("click", () => {
  itemForm.reset();
  selectedItemId = null;
  deleteItemBtn.disabled = true;
  renderItems();
});

itemForm.addEventListener("reset", () => {
  selectedItemId = null;
  deleteItemBtn.disabled = true;
});

deleteItemBtn.addEventListener("click", async () => {
  if (!selectedItemId) return;
  await deleteItem(selectedItemId);
  speak("Usunięto wpis");
  itemForm.reset();
  deleteItemBtn.disabled = true;
  selectedItemId = null;
  await refreshState();
});

ruleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(ruleForm);
  const payload: Partial<DomainRule> & { pattern: string } = {
    id: (formData.get("id") as string) || undefined,
    pattern: (formData.get("pattern") as string).trim(),
    includeFolders: parseCsv((formData.get("includeFolders") as string) || ""),
    excludeFolders: parseCsv((formData.get("excludeFolders") as string) || ""),
    boostTags: parseCsv((formData.get("boostTags") as string) || ""),
    disableOnHost: Boolean(formData.get("disableOnHost")),
    notes: (formData.get("notes") as string) || undefined
  };
  if (!payload.pattern) {
    speak("Pattern jest wymagany");
    return;
  }
  await upsertDomainRule(payload);
  speak("Zapisano regułę");
  ruleForm.reset();
  deleteRuleBtn.disabled = true;
  selectedRuleId = null;
  await refreshState();
});

document.getElementById("clear-rule")?.addEventListener("click", () => {
  ruleForm.reset();
  deleteRuleBtn.disabled = true;
  selectedRuleId = null;
  renderRules();
});


deleteRuleBtn.addEventListener("click", async () => {
  if (!selectedRuleId) return;
  await deleteDomainRule(selectedRuleId);
  speak("Usunięto regułę");
  ruleForm.reset();
  deleteRuleBtn.disabled = true;
  selectedRuleId = null;
  await refreshState();
});

maxSuggestionsInput.addEventListener("change", async () => {
  const value = Number(maxSuggestionsInput.value) || 6;
  await updateSettings({
    maxSuggestions: Math.min(10, Math.max(1, value))
  });
  speak("Zaktualizowano liczbę sugestii");
  await refreshState();
});

themeSelect.addEventListener("change", async () => {
  await updateSettings({ theme: themeSelect.value as "system" | "dark" | "light" });
  speak("Zmieniono motyw");
  await refreshState();
});

const updateShortcuts = async () => {
  await updateSettings({
    shortcuts: {
      openDropdown: shortcutOpenInput.value || "Alt+J",
      forceDropdown: shortcutForceInput.value || "Alt+ArrowDown"
    }
  });
  speak("Zmieniono skróty");
  await refreshState();
};

shortcutOpenInput.addEventListener("blur", updateShortcuts);
shortcutForceInput.addEventListener("blur", updateShortcuts);

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nativefill-backup-${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  speak("Wyeksportowano backup");
});

importBtn.addEventListener("click", () => hiddenImport.click());

hiddenImport.addEventListener("change", async () => {
  const file = hiddenImport.files?.[0];
  if (!file) return;
  const text = await file.text();
  try {
    const payload = JSON.parse(text) as NativeFillState;
    await browser.storage.local.set({ [stateKey]: payload });
    speak("Zaimportowano dane");
    await refreshState();
  } catch (error) {
    console.error(error);
    speak("Nie udało się zaimportować pliku");
  } finally {
    hiddenImport.value = "";
  }
});

const testRuleMatch = () => {
  const domain = testDomainInput.value.trim();
  if (!domain) {
    testResult!.textContent = "Brak hosta";
    return;
  }
  const resolution = resolveDomainRules(domain, state.domainRules);
  testResult!.textContent = resolution.disable
    ? "Sugestie wyłączone"
    : `Include: ${Array.from(resolution.includeFolders).join(", ") || "*"}`;
};

document.getElementById("test-rule")?.addEventListener("click", testRuleMatch);

testDomainInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    testRuleMatch();
  }
});

browser.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "local" || !changes[stateKey]) return;
  await refreshState();
});

void refreshState();
