# Plan testów — NativeFill v2.1

## 1. Narzędzia i zakres
- **Playwright** (Chromium, Firefox, WebKit) — główny silnik E2E; trace + video na failu.  
- **Bun/Vitest** — testy jednostkowe i modułowe uruchamiane w CI.  
- **web-ext** — lint/run/build dla Firefoksa.  
- **Safari toolchain** — `safari-web-extension-converter`, Xcode, TestFlight (macOS + iOS).  
- **Prod smoke** — ręczne checklisty dla App Store Connect/TestFlight/CWS.

## 2. Strategia (piramida testowa)
| Warstwa | Cel | Zakres |
| --- | --- | --- |
| Static checks | Biome lint/format + TypeScript w Husky/CI | regressje składniowe |
| Unit (UT) | Funkcje deterministyczne (domain rules, state, fuzzy) | Bun/Vitest |
| Integracyjne (IT) | Moduły z mockami `browser.*` (background, content, options, popup) | Bun/Vitest + jsdom |
| E2E | Kryteria akceptacji A–H | Playwright matrix |
| Manual | Safari/iOS, dostępność NVDA/VoiceOver, publikacja sklepowa | QA checklist |

## 3. Testy jednostkowe (UT-###, Bun/Vitest)
- **UT-001 Domain rules** (`src/utils/domain.ts`): dopasowania exact/wildcard, `disableOnHost`, kolejność zgodna z `ACCEPTANCE D`.  
- **UT-002 State persistence** (`src/utils/state.ts`): CRUD, de-dupe importu (`label+hash(value)`), timestamps, brak zapisów sieci (`ACCEPTANCE C`).  
- **UT-003 Fuzzy scoring** (`src/utils/fuzzy/*`): WASM success, fallback parity (różnica rankingu ≤1), highlight markup.  
- **UT-004 Sensitive detection** (`src/entrypoints/content/index.ts` helpers): blokowanie `password/cc/cvv/iban/pesel` i autopole `autocomplete="off"` (ACCEPTANCE F).  
- **UT-005 Domain rule resolver perf**: limitowanie listy, boost tagów, include/exclude, brak degradacji przy 10k wpisach.  
- **UT-006 Message contracts** (`src/types/messages.ts`): tsd/zod ensuring API stability.  
Coverage target ≥90 % linii dla utils.

## 4. Testy integracyjne (IT-###, Bun/Vitest + jsdom)
- **IT-001 Background SW**: symulacja `browser.storage.onChanged`, przebudowa context menu, broadcast do zakładek.  
- **IT-002 Context menu click → content fill**: stub `browser.tabs.sendMessage`, weryfikacja `nativefill:apply-value`.  
- **IT-003 Content script DOM**: jsdom + `KeyboardEvent` — dropdown lifecycle, skróty (`Alt+J`, `Alt+↓`), aria wiring.  
- **IT-004 Options UI CRUD**: form submission, import/export JSON (w tym błędny plik), live region komunikaty.  
- **IT-005 Popup search**: fuzzy ranking kroku `rank`, wysyłanie `nativefill:apply-value` do aktywnej karty.  
- **IT-006 WASM fallback**: blokada `WebAssembly.instantiate` → TS fallback bez crashy.

## 5. Scenariusze E2E (Playwright, TP-###)
1. **TP-001 Sugestie & latencja** — wpis „kon”; dropdown ≤150 ms; Enter wkleja wartość (`ACCEPTANCE B`).  
2. **TP-002 Menu PPM** — kontekstowe menu folderów + wklejenie (`Pitch + UX`).  
3. **TP-003 Współistnienie** — Chrome autofill vs wymuszony `Alt+↓`.  
4. **TP-004 Pola wrażliwe** — brak dropdownu dla `type=password`/pattern sensitive.  
5. **TP-005 Import/eksport** — eksport JSON → reset storage → import → stan identyczny, duplikaty scalone.  
6. **TP-006 Offline storage** — DevTools Storage Sync puste, brak requestów sieci (monitor).  
7. **TP-007 Options UX** — zmiana ustawień, `aria-live="polite"`, focus zachowany.  
8. **TP-008 Domain rules** — wildcard vs exact precedence, `Disable on host` ukrywa dropdown/PPM.  
9. **TP-009 WASM** — `initWasm()` <100 ms; `match()` ≤3 ms przy 5k rekordów; fallback TS (blokada WASM).  
10. **TP-010 Shadow DOM izolacja** — host z agresywnym CSS, brak kolizji.  
11. **TP-011 Shortcut remap** — zmiana skrótów w Options, odzwierciedlona w content script.  
12. **TP-012 Context broadcast** — edycja danych → live update w aktywnych kartach.  
Każdy scenariusz uruchomić dla Chromium/Firefox/WebKit (TP-003 w Chrom tylko, reszta pełna matrix).

## 6. Testy specyficzne dla przeglądarek
- **Chromium/Edge**: MV3 SW lifecycle (suspend/resume), `scripting` API call, bundle <250 KB (`ACCEPTANCE A + G`).  
- **Firefox**: `web-ext run` smoke, `web-ext build` generuje `.xpi` z `browser_specific_settings.gecko.id`, Event Page reaktywowany po restarcie (`TEST_PLAN §3`).  
- **Safari macOS**: konwersja przez `safari-web-extension-converter`, dropdown/PPM/options manual.  
- **Safari iOS**: aktywacja rozszerzenia, formularze mobilne, PPM gesty.  
- **Store flows**: CWS/Edge listing, App Store Connect upload (screenshots, disclosures).

## 7. Dostępność (AX-###)
- **AX-001 VoiceOver/NVDA**: combobox/listbox roles, `aria-activedescendant`, `aria-live` komunikaty.  
- **AX-002 Keyboard-only**: Options i popup bez myszy, `Esc` zamyka dropdown, focus powraca (`ACCEPTANCE B`).  
- **AX-003 Contrast & theme**: Dark/Light/system w Options + dropdown (WCAG AA).  
- Dokumentować nagrania + wynik audytu.

## 8. Wydajność i niezawodność
- **PF-001 Dropdown latency**: capture Perf panel, pierwsza sugestia ≤150 ms, render ≤4 ms.  
- **PF-002 Long-task guard**: brak >50 ms w content script podczas intensywnego wpisywania (profil 60 min) (`ACCEPTANCE G`).  
- **PF-003 Memory drift**: heap stabilny ±10 % po godzinie.  
- **PF-004 Bundle size**: skrypt CI mierzy `dist/<browser>` gzip <250 KB.  
- **PF-005 Stress test**: 5k wpisów, 1k reguł domenowych, brak crashy.

## 9. Bezpieczeństwo i prywatność
- **SEC-001 Permissions audit**: manifest tylko `storage`, `contextMenus`, `activeTab`, `scripting`.  
- **SEC-002 Network monitor**: brak requestów poza next context; potwierdza `ACCEPTANCE C`.  
- **SEC-003 Data exfil checks**: Playwright + DevTools blocking ensures storage ops local.  
- **SEC-004 Import validation**: złośliwe JSON (XSS/HTML) → sanitizacja bez injection.

## 10. Dane testowe i fixtury
- Seed state via `browser.storage.local` snapshots (3 przykładowe wpisy z `src/utils/state.ts`).  
- Dedykowane JSON: `fixtures/items-basic.json`, `fixtures/rules-conflict.json`, `fixtures/import-malformed.json`.  
- Użyj deteterministycznych UUID (stub `crypto.randomUUID`) w UT/IT.  
- Zmienne środowiskowe Playwright dla hostów testowych (np. `PLAYWRIGHT_TEST_URL`).

## 11. Automatyzacja i CI/CD
1. `bun install`  
2. Static checks (`bun run check`)  
3. UT/IT (`bun run test:unit` / `test:integration`)  
4. Playwright matrix (`bun run test -- --project=<browser>` parallel)  
5. `web-ext lint && build`  
6. Bundle size + WASM benchmark job  
7. Artifact upload (trace, videos, coverage)  
8. Manual Safari checklist gating release  
Nightly job re-runs PF/SEC scenarios + long-run typing script; flake tracker tworzy issues.

## 12. Kryteria releasu / regresji
- Wszystkie acceptance tests (A–H) odhaczone (`docs/ACCEPTANCE_CRITERIA.md`).  
- Playwright suite zielony we wszystkich przeglądarkach; brak testów w quarantine.  
- web-ext + Safari checklist podpisane.  
- Performance raport (latencja, bundle, memory) załączony do RC.  
- Accessibility run log, security/network log i sync/backup deklaracja dodane do release notes.  
- Każdy regresyjny bug otrzymuje scenariusz w odpowiedniej warstwie (UT/IT/E2E) przed zamknięciem ticketu.
