# AGENTS.md — orkiestracja dla Codex

## Cel
Zbudować wieloprzeglądarkowy addon na bazie `PRD.md`, bez telemetrii, z *native‑like* UX i minimalnymi uprawnieniami.

## Role
1. **Architect** — wybiera szablon **WXT**, ustawia `browser.*` polyfill, konfiguruje targets (Chrome/Edge MV3; Firefox/Safari zgodnie z doc).  
2. **Builder** — generuje: **Manifest V3**, **Service Worker** (Chromium), **Event Page** (FF), **content script**, **options**/**popup**, i18n.  
3. **Security** — ogranicza `permissions`, blokuje pola wrażliwe, dodaje opcjonalne szyfrowanie lokalne.  
4. **Sync** — implementuje `storage.local` + przełącznik `storage.sync`; przygotowuje **Drive appData** (feature flag, OAuth przez `identity`).  
5. **UX** — implementuje dropdown z ARIA, Shadow DOM, tryb dark/light; Options UI wg §6 PRD.  
6. **QA** — odpala testy z `TEST_PLAN.md` (Playwright + web‑ext), zbiera artefakty.  
7. **Release** — pakuje per przeglądarka (WXT, web‑ext, Xcode/App Store Connect), tworzy listingi ze `CWS_Listing.md` i `PUBLISHING.md`.

## Zadania startowe (must‑do)
- Wygeneruj projekt WXT z TS.  
- Dodaj `webextension-polyfill` oraz adapter `browser` do DI.  
- **Manifesty**:  
  - Chromium: MV3 + `service_worker`.  
  - Firefox: MV3 + `background.scripts` (Event Page) fallback jeśli SW niedostępny.  
  - Safari: target domyślny WXT dla Safari; przygotuj paczkę do konwersji Xcode.  
- Utwórz **options**/**popup** jako proste HTML/TS (bez frameworka) lub lekki Preact/Vanilla — decyzja `UX`.  
- Zaimplementuj **menedżer danych** + **sugestie** (fuzzy), **PPM**.  
- Dodaj `storage.sync` przełącznik i UI statusu.  
- Przygotuj **testy Playwright** (Chromium/Firefox/WebKit) oraz **web‑ext** smoke.

## Wytyczne niefunkcjonalne
- Brak zewnętrznej telemetrii.  
- Wielkość bundle < 250 KB.  
- Kod zgodny z Biome/Oxlint.  
- A11y AA.

## Definition of Done
- Wszystkie **Acceptance Criteria** zielone.  
- **E2E** przechodzi w Chromium/Firefox/WebKit.  
- Paczki: ZIP (CWS/Edge), XPI (AMO), Xcode projekt (Safari macOS+iOS) + instrukcje wydania.
