# Kryteria akceptacji — NativeFill v2.1

## A. Multi‑browser
- **Chromium (Chrome/Edge)**: manifest **MV3**, **Service Worker** aktywny, `scripting` działa.  
- **Firefox**: paczka **.xpi**, **Event Page** działa po restarcie; funkcjonalnie równoważne z Chromium.  
- **Safari macOS**: projekt po konwersji działa (dropdown, PPM, manager).  
- **Safari iOS**: rozszerzenie aktywne w Ustawieniach Safari, dropdown/PPM/manager działają (manual).

## B. UX „native‑like”
- Dropdown pojawia się ≤ **150 ms** od wpisania znaku; `↑/↓/Enter/Esc` działają; ARIA ogłasza liczbę opcji.  
- Shadow DOM eliminuje kolizje styli na 20 losowych stronach (smoke OK).  
- Options UI zapisuje stan bez utraty focusu; `aria-live="polite"` informuje „Saved”.

## C. Dane i Sync
- Domyślnie `storage.local`; toggle **Sync** kopiuje dane do `storage.sync` i po re‑loadzie są dostępne na 2. profilu.  
- Import/eksport JSON zachowuje integralność; duplikaty łączone po `label+hash(value)`.  
- Brak requestów sieci przy wyłączonym Sync/Backup.

## D. Domain Rules
- Precedencja: `exact` > `*.domain` > `*.*.domain` > `global`.  
- **Disable on this domain** ukrywa dropdown/PPM na hostach zgodnych z regułą.  
- Editor reguł oferuje CRUD + „Test match”; eksport/import JSON działa.

## E. WASM fuzzy
- **ON (domyślnie)**: `initWasm()` ≤ **100 ms** (ciepły cache); `match()` ≤ **3 ms** dla listy **5k** elementów.  
- **Fallback**: brak WASM → TS działa bez błędów; ranking różni się co najwyżej o **1** pozycję.

## F. Bezpieczeństwo
- Pola password/cc/cvv/iban/pesel → **zero sugestii**.  
- Minimalne permissions; `identity` tylko po włączeniu backupu.

## G. Wydajność
- Render listy ≤ **4 ms**; brak długich tasków > **50 ms** w content script.  
- Bundle < **250 KB**.

## H. Testy
- **Playwright**: projekty `chromium`, `firefox`, `webkit` — wszystkie scenariusze z `TEST_PLAN.md` zielone.  
- **web‑ext**: `run`/`build` bez krytycznych ostrzeżeń.  
- **Safari**: checklist macOS+iOS odhaczona.
