# NativeFill — PRD v2.1 (multibrowser, Biome‑only, WASM on)

**Data:** 2025-11-07  
**Punkt startowy dla Codex:** ten plik

## 0. Pitch
NativeFill to form‑autofill z **„native‑like”** sugestiami i PPM. Wersja **v2.1** dowozi:  
- **Multi‑browser**: Chrome/Edge (**MV3 SW**), Firefox (**MV3 Event Page**), Safari (macOS+iOS, konwersja WebExtension).  
- **WASM fuzzy‑match — domyślnie WŁĄCZONE** (Rust→WASM; fallback TS).  
- **Reguły per domena** (boost, include/exclude folderów, „Disable on this domain”).  
- **Biome‑only** (formatter+lint), **Playwright‑only** (E2E). Brak MCP.

## 1. Zakres funkcjonalny
- **Sugestie** w polach tekstowych i `textarea`: prefiks/fuzzy, `↑/↓/Enter/Esc`, IME‑safe, ARIA combobox/listbox.  
- **Menu PPM**: foldery/elementy, klik → wklej do aktywnego pola.  
- **Manager danych**: CRUD `label/value/type`, **foldery**, **profile**, **tagi**, **aliasy**; import/eksport JSON; deduplikacja po `label+hash(value)`.  
- **Reguły domenowe**: priorytetowanie i filtrowanie sugestii, wyłączanie na hostach.  
- **Storage**: wyłącznie lokalnie (`storage.local`).  
- **Backup w chmurze**: brak (użytkownik może jedynie eksportować/importować JSON).  
- **Prywatność**: brak telemetrii; twarde wykluczenia pól wrażliwych (hasła/karty/identyfikatory).  
- **Onboarding**: < 30 s, 3 przykładowe wpisy i skróty klawiszowe.

## 2. UX „native‑like”
- Dropdown **przy polu**, max 6 pozycji, brak „overlay hell”; pozycjonowanie z `ResizeObserver`/`IntersectionObserver`.  
- ARIA: `combobox` + `listbox/option`, `aria‑activedescendant`; focus management zgodnie z WAI‑ARIA APG.  
- Shadow DOM → brak konfliktów CSS; dark/light z `prefers-color-scheme`.  
- Współistnienie z autofill Chrome: nasz dropdown pojawia się po pierwszym znaku lub skrótem (`Alt+↓`).

## 3. Architektura i narzędzia
- **Build:** **WXT** (multi‑target, auto‑manifest, HMR).  
- **API:** `webextension-polyfill` → `browser.*`.  
- **Języki:** TypeScript + **Rust→WASM** (fuzzy).  
- **Lint/format:** **Biome** (jedyny linter/formatter).  
- **Testy:** **Playwright** (Chromium/Firefox/WebKit) + `web-ext` smoke dla FF.  
- **Moduły:**  
  - **Background**: SW (Chromium) / Event Page (Firefox); rejestracja PPM, storage, messaging.  
  - **Content script**: fokus/klawiatura, render dropdownu (Shadow DOM), wklejanie.  
  - **Options/Popup**: panel ustawień i szybkie akcje.

## 4. Multi‑browser
- **Chromium (Chrome/Edge)**: **MV3 + Service Worker**, `scripting`.  
- **Firefox**: MV3 **bez SW** → **Event Page**; API przez `browser.*`.  
- **Safari macOS/iOS**: build target „safari” w WXT → pakowanie przez **Xcode** (`safari-web-extension-converter`) **lub** upload ZIP do **App Store Connect** (TestFlight).

## 5. Dane
```json
{
  "Item": {
    "id": "uuid",
    "label": "Konrad – email",
    "value": "konrad@example.com",
    "type": "singleline|multiline",
    "tags": ["email","work"],
    "aliases": ["mail","work mail"],
    "profile": "Work",
    "createdAt": "ISO",
    "updatedAt": "ISO"
  },
  "DomainRule": {
    "id": "uuid",
    "pattern": "linkedin.com|*.linkedin.com",
    "includeFolders": ["Work"],
    "excludeFolders": ["Personal"],
    "boostTags": ["job","outreach"],
    "disableOnHost": false,
    "notes": "Preferuj służbowe na LinkedIn"
  }
}
```

**Precedencja reguł domenowych:** `exact` > `*.domain` > `*.*.domain` > `global`. Konflikty: `disableOnHost` wygrywa; inne akcje mogą się sumować (boost).

## 6. Options UI (konkret)
- **Sekcje:** *Data* (lista + CRUD), *Behavior* (sugestie, skróty, **Domain Rules** z „Test match”).  
- **Wzorce UI:** system font, 8 px radius, 4/8/12 spacing; focus ring; `aria-live="polite"` przy zapisie; dark/light.  
- **Skróty:** `Alt+J` (otwórz dropdown bez pisania), `Alt+↓` (wymuś dropdown).

## 7. WASM fuzzy (ON by default)
- **Crate**: `sublime_fuzzy` lub `nucleo`; eksport przez `wasm-bindgen`.  
- **API JS**: `initWasm(): Promise<void>`, `score(q, c): number`, `match(q, list, k): string[]`.  
- **Fallback**: jeśli WASM nie załaduje się (np. Safari iOS low‑mem/CSP) → automatycznie użyj wersji TS (bez zmian w UX).

## 8. Bezpieczeństwo i prywatność
- Minimalne uprawnienia: `storage`, `contextMenus`, `activeTab`, `scripting`.  
- **Brak telemetrii.** Pola wrażliwe (password/cc/cvv/iban/pesel) → **brak sugestii**.  
- (Opcjonalnie) szyfrowanie lokalne: AES‑GCM; klucz z hasła głównego (PBKDF2/scrypt), TTL 12h lub do restartu.

## 9. KPI i wydajność
- Dropdown ≤ **150 ms** od wpisu pierwszego znaku; render ≤ **4 ms**.  
- Bundle ≤ **250 KB**. 0 błędów konsoli na top‑stronach (smoke).

## 10. Definition of Done (do weryfikacji wg ACCEPTANCE_CRITERIA.md)
- Multi‑browser: Chromium SW, Firefox Event Page, Safari macOS+iOS działają.  
- Domain Rules + WASM spełniają metryki.  
- Testy Playwright zielone (Chromium/Firefox/WebKit).  
- Brak sieciowych requestów poza kontekstowym storage.local.
