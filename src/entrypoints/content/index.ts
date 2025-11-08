import { defineContentScript } from "wxt/utils/define-content-script";
import browser from "webextension-polyfill";
import type { RankedItem } from "@utils/fuzzy";
import { fuzzyEngine } from "@utils/fuzzy";
import { resolveDomainRules } from "@utils/domain";
import { isFillableField } from "@utils/fields";
import type { NativeFillState } from "@types/data";
import dropdownStyles from "@styles/dropdown.css?inline";

const MAX_VISIBLE = 6;

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  main() {
    const host = document.createElement("div");
    host.id = "nativefill-dropdown-host";
    host.style.position = "absolute";
    host.style.zIndex = "2147483646";
    host.style.pointerEvents = "none";
    host.style.display = "none";
    host.style.width = "auto";
    host.dataset.state = "hidden";

    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = dropdownStyles;
    const wrapper = document.createElement("div");
    wrapper.className = "nativefill-wrapper";
    wrapper.setAttribute("role", "presentation");
    const header = document.createElement("div");
    header.className = "nativefill-header";
    header.textContent = "NativeFill";
    const list = document.createElement("ul");
    list.className = "nativefill-list";
    list.id = "nativefill-list";
    list.setAttribute("role", "listbox");
    wrapper.append(header, list);
    shadow.append(style, wrapper);
    document.documentElement?.append(host);

    const ensureLiveRegion = (): HTMLDivElement => {
      const existing = document.getElementById("nativefill-live-region");
      if (existing) {
        return existing as HTMLDivElement;
      }
      const region = document.createElement("div");
      region.id = "nativefill-live-region";
      region.setAttribute("role", "status");
      region.setAttribute("aria-live", "polite");
      region.setAttribute("aria-atomic", "true");
      region.style.position = "fixed";
      region.style.width = "1px";
      region.style.height = "1px";
      region.style.margin = "-1px";
      region.style.padding = "0";
      region.style.border = "0";
      region.style.overflow = "hidden";
      region.style.clip = "rect(0 0 0 0)";
      region.style.clipPath = "inset(50%)";
      region.style.whiteSpace = "nowrap";
      (document.body ?? document.documentElement ?? document).append(region);
      return region;
    };

    const liveRegion = ensureLiveRegion();
    const setLiveText = (message: string) => {
      if (liveRegion.textContent !== message) {
        liveRegion.textContent = message;
      }
    };

    const formatSuggestionCount = (count: number) => {
      if (count === 1) return "1 sugestia";
      if (count >= 2 && count <= 4) return `${count} sugestie`;
      return `${count} sugestii`;
    };

    const announceSuggestions = (count: number, query: string) => {
      if (count <= 0) {
        setLiveText(query ? "Brak sugestii dla tego tekstu." : "Brak sugestii. Zacznij pisać.");
        return;
      }
      setLiveText(`NativeFill: ${formatSuggestionCount(count)} dostępne.`);
    };

    setLiveText("NativeFill gotowy do sugestii.");

    let activeField: HTMLInputElement | HTMLTextAreaElement | null = null;
    let activeIndex = -1;
    let currentSuggestions: RankedItem[] = [];
    let cachedState: NativeFillState | null = null;
    let stateRequest: Promise<NativeFillState> | null = null;

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updatePosition())
        : null;
    const intersectionObserver =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) {
                hideDropdown();
              }
            });
          })
        : null;

    const ensureState = async (): Promise<NativeFillState> => {
      if (cachedState) return cachedState;
      if (!stateRequest) {
        stateRequest = browser.runtime
          .sendMessage({ type: "nativefill:get-state" })
          .then((response: { state: NativeFillState }) => {
            cachedState = response.state;
            stateRequest = null;
            return cachedState;
          })
          .catch(() => {
            stateRequest = null;
            throw new Error("NativeFill: unable to load state");
          });
      }
      return stateRequest;
    };

    const matchesShortcut = (event: KeyboardEvent, shortcut: string) => {
      const parts = shortcut.toLowerCase().split("+").map((chunk) => chunk.trim());
      const descriptor = {
        alt: parts.includes("alt"),
        ctrl: parts.includes("ctrl") || parts.includes("control"),
        shift: parts.includes("shift"),
        meta: parts.includes("meta") || parts.includes("cmd"),
        key: parts[parts.length - 1]
      };
      return (
        event.altKey === descriptor.alt &&
        event.ctrlKey === descriptor.ctrl &&
        event.shiftKey === descriptor.shift &&
        event.metaKey === descriptor.meta &&
        event.key.toLowerCase() === descriptor.key
      );
    };

    const hideDropdown = () => {
      host.style.display = "none";
      host.style.pointerEvents = "none";
      activeIndex = -1;
      currentSuggestions = [];
      list.innerHTML = "";
      host.dataset.state = "hidden";
      announceSuggestions(0, activeField?.value ?? "");
    };

    const showDropdown = () => {
      if (!activeField) return;
      host.style.display = "block";
      host.style.pointerEvents = "auto";
      if (host.dataset.state !== "disabled") {
        host.dataset.state = "visible";
      }
    };

    const updatePosition = () => {
      if (!activeField) return;
      const rect = activeField.getBoundingClientRect();
      const top = rect.bottom + window.scrollY + 4;
      const left = rect.left + window.scrollX;
      host.style.top = `${top}px`;
      host.style.left = `${left}px`;
      host.style.minWidth = `${rect.width}px`;
    };

    const renderList = (suggestions: RankedItem[], query: string) => {
      host.dataset.state = "visible";
      list.innerHTML = "";
      if (!suggestions.length) {
        const empty = document.createElement("li");
        empty.className = "nativefill-empty";
        empty.setAttribute("role", "option");
        empty.setAttribute("aria-disabled", "true");
        empty.textContent = query ? "Brak dopasowań" : "Zacznij pisać lub użyj Alt+J";
        list.append(empty);
        announceSuggestions(0, query);
        return;
      }
      suggestions.forEach((suggestion, index) => {
        const li = document.createElement("li");
        li.className = "nativefill-item";
        li.id = `nativefill-option-${index}`;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(index === activeIndex));
        li.dataset.index = String(index);

        const label = document.createElement("div");
        label.className = "nativefill-label";
        label.innerHTML = suggestion.highlightedLabel;

        const meta = document.createElement("div");
        meta.className = "nativefill-meta";
        meta.innerHTML = `${suggestion.item.folder} · ${suggestion.item.profile}`;

        li.append(label, meta);
        li.addEventListener("mousemove", () => {
          activeIndex = index;
          li.setAttribute("aria-selected", "true");
        });
        li.addEventListener("mousedown", (event) => {
          event.preventDefault();
          applySuggestion(index);
        });

        list.append(li);
      });
      announceSuggestions(suggestions.length, query);
    };

    const renderDisabled = () => {
      list.innerHTML = "";
      const li = document.createElement("li");
      li.className = "nativefill-empty";
      li.setAttribute("role", "option");
      li.setAttribute("aria-disabled", "true");
      li.textContent = "NativeFill wyłączony na tej domenie";
      list.append(li);
      updatePosition();
      host.dataset.state = "disabled";
      setLiveText("NativeFill wyłączony na tej domenie.");
      showDropdown();
    };

    const attachField = (field: HTMLInputElement | HTMLTextAreaElement) => {
      activeField = field;
      activeField.setAttribute("aria-controls", list.id);
      resizeObserver?.observe(field);
      intersectionObserver?.observe(field);
      updatePosition();
    };

    const detachField = () => {
      if (activeField) {
        resizeObserver?.unobserve(activeField);
        intersectionObserver?.unobserve(activeField);
        activeField.removeAttribute("aria-controls");
      }
      activeField = null;
      hideDropdown();
    };

    const applySuggestion = (index: number) => {
      if (!activeField) return;
      const suggestion = currentSuggestions[index];
      if (!suggestion) return;
      activeField.focus();
      const value = suggestion.item.value;
      activeField.value = value;
      const inputEvent = new Event("input", { bubbles: true });
      const changeEvent = new Event("change", { bubbles: true });
      activeField.dispatchEvent(inputEvent);
      activeField.dispatchEvent(changeEvent);
      hideDropdown();
    };

    const refreshSuggestions = async (reason: "input" | "shortcut") => {
      const state = await ensureState();
      if (!activeField) return;
      const query = activeField.value;
      await fuzzyEngine.init();
      const resolution = resolveDomainRules(window.location.host, state.domainRules);
      if (resolution.disable) {
        renderDisabled();
        return;
      }
      const suggestions = fuzzyEngine.rank(query, state.items, {
        limit: state.settings.maxSuggestions ?? MAX_VISIBLE,
        resolution
      });
      currentSuggestions = suggestions;
      activeIndex = suggestions.length ? 0 : -1;
      renderList(suggestions, query);
      if (activeIndex >= 0) {
        activeField?.setAttribute("aria-activedescendant", `nativefill-option-${activeIndex}`);
      } else {
        activeField?.removeAttribute("aria-activedescendant");
      }
      if (suggestions.length || reason === "shortcut") {
        updatePosition();
        showDropdown();
      } else {
        hideDropdown();
      }
    };

    document.addEventListener("focusin", (event) => {
      if (!isFillableField(event.target)) {
        detachField();
        return;
      }
      attachField(event.target);
      void refreshSuggestions("input");
    });

    document.addEventListener("focusout", (event) => {
      if (!activeField) return;
      if (event.target === activeField && !host.contains(document.activeElement)) {
        detachField();
      }
    });

    document.addEventListener(
      "input",
      (event) => {
        if (!isFillableField(event.target)) return;
        attachField(event.target);
        void refreshSuggestions("input");
      },
      true
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (!activeField) return;
        const shortcuts = cachedState?.settings.shortcuts ?? {
          openDropdown: "Alt+J",
          forceDropdown: "Alt+ArrowDown"
        };
        if (matchesShortcut(event, shortcuts.openDropdown)) {
          event.preventDefault();
          void refreshSuggestions("shortcut");
          return;
        }
        if (matchesShortcut(event, shortcuts.forceDropdown)) {
          event.preventDefault();
          void refreshSuggestions("shortcut");
          return;
        }
        if (host.style.display === "none") return;
        switch (event.key) {
          case "ArrowDown":
            event.preventDefault();
            activeIndex = Math.min(currentSuggestions.length - 1, activeIndex + 1);
            renderList(currentSuggestions, activeField.value);
            activeField.setAttribute("aria-activedescendant", `nativefill-option-${activeIndex}`);
            break;
          case "ArrowUp":
            event.preventDefault();
            activeIndex = Math.max(0, activeIndex - 1);
            renderList(currentSuggestions, activeField.value);
            activeField.setAttribute("aria-activedescendant", `nativefill-option-${activeIndex}`);
            break;
          case "Enter":
            if (activeIndex >= 0) {
              event.preventDefault();
              applySuggestion(activeIndex);
            }
            break;
          case "Escape":
            hideDropdown();
            break;
          default:
            break;
        }
      },
      true
    );

    document.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    browser.runtime.onMessage.addListener((message) => {
      if (message.type === "nativefill:data") {
        cachedState = message.state;
        if (activeField) {
          void refreshSuggestions("input");
        }
      }
      if (message.type === "nativefill:apply-value") {
        if (!activeField) {
          const focusable = document.activeElement;
          if (isFillableField(focusable)) {
            activeField = focusable;
          }
        }
        if (activeField) {
          const start = activeField.selectionStart ?? activeField.value.length;
          const end = activeField.selectionEnd ?? activeField.value.length;
          const newValue = `${activeField.value.slice(0, start)}${message.value}${activeField.value.slice(end)}`;
          activeField.value = newValue;
          const inputEvent = new Event("input", { bubbles: true });
          activeField.dispatchEvent(inputEvent);
        }
      }
    });

    void fuzzyEngine.init();
    void ensureState();
  }
});
