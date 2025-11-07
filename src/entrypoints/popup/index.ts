import browser from "webextension-polyfill";
import type { NativeFillItem, NativeFillState } from "@types/data";
import { fuzzyEngine } from "@utils/fuzzy";
import popupStyles from "@styles/popup.css?inline";

const style = document.createElement("style");
style.textContent = popupStyles;
document.head.appendChild(style);

const listEl = document.getElementById("popup-list");
const searchInput = document.getElementById("popup-search") as HTMLInputElement;
const optionsBtn = document.getElementById("open-options") as HTMLButtonElement;
const countLabel = document.getElementById("popup-count");

let state: NativeFillState;
let filtered: NativeFillItem[] = [];

const ensureState = async () => {
  if (state) return state;
  const response = await browser.runtime.sendMessage({ type: "nativefill:get-state" });
  state = response.state as NativeFillState;
  if (countLabel) {
    countLabel.textContent = `${state.items.length} wpisów`;
  }
  await fuzzyEngine.init();
  filtered = state.items;
  renderList(filtered.slice(0, 5));
  return state;
};

const renderList = (items: NativeFillItem[]) => {
  if (!listEl) return;
  if (!items.length) {
    listEl.innerHTML = '<div class="popup-item">Brak wyników</div>';
    return;
  }
  listEl.innerHTML = items
    .map(
      (item) => `<div class="popup-item" data-id="${item.id}">
        <strong>${item.label}</strong>
        <small>${item.folder} · ${item.profile}</small>
      </div>`
    )
    .join("");
};

listEl?.addEventListener("click", async (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>(".popup-item");
  if (!target) return;
  await ensureState();
  const item = state.items.find((entry) => entry.id === target.dataset.id);
  if (!item) return;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await browser.tabs.sendMessage(tab.id, { type: "nativefill:apply-value", value: item.value });
    window.close();
  }
});

searchInput?.addEventListener("input", async () => {
  await ensureState();
  const term = searchInput.value;
  if (!term) {
    filtered = state.items;
    renderList(filtered.slice(0, 5));
    return;
  }
  const ranked = fuzzyEngine.rank(term, state.items, { limit: 5 });
  filtered = ranked.map((entry) => entry.item);
  renderList(filtered);
});

optionsBtn?.addEventListener("click", () => {
  browser.runtime.openOptionsPage();
});

void ensureState();
