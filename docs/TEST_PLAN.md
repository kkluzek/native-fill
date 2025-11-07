# Plan testów — NativeFill v2.1

## 1. Narzędzia
- **Playwright**: Chromium, Firefox, WebKit; artefakty: video + trace.  
- **web‑ext**: run/lint/build dla Firefox.  
- **Xcode/App Store Connect**: Safari macOS+iOS (manual konwersja/udostępnienie).

## 2. Scenariusze E2E (Playwright)
- **TP‑001 Sugestie** — w `input` wpisz „kon”; dropdown ≤150 ms; `Enter` wkleja wartość. (Chrom/FF/WebKit)  
- **TP‑002 PPM** — PPM → NativeFill → „Imię” → wartość wklejona do aktywnego pola.  
- **TP‑003 Współistnienie** — gdy Chrome pokazuje autofill, nasz dropdown pojawia się dopiero po `Alt+↓` lub wpisie znaku. (Chrom)  
- **TP‑004 Bezpieczeństwo** — `type=password` i podobne → brak sugestii.  
- **TP‑005 Import/eksport** — eksport JSON, wyczyść, import → dane zgodne; duplikaty scalone.  
- **TP‑006 Offline storage** — potwierdź, że Options UI nie zawiera przełączników Sync/Backup i że dane pozostają wyłącznie w `storage.local` (np. panel Storage Sync w DevTools pozostaje pusty).  
- **TP‑007 Options** — zmiana ustawień; `aria-live` ogłasza „Saved”; focus nie ginie.  
- **TP‑008 Domain Rules** — `*.linkedin.com` boostuje folder „Work”; `www.linkedin.com` (exact) wygrywa nad wildcard.  
- **TP‑009 WASM** — `initWasm()` OK; `match()` ≤3 ms na 5k; sztucznie zablokuj WASM → fallback TS zachowuje funkcjonalność.

## 3. Firefox (web‑ext)
- `web-ext run` → brak błędów; Event Page działa po restarcie.  
- `web-ext build` → generuje `.xpi`; `browser_specific_settings.gecko.id` obecny.

## 4. Safari (manual)
- **macOS**: `safari-web-extension-converter` → zbuduj i uruchom; sprawdź dropdown/PPM/manager.  
- **iOS**: włącz rozszerzenie w Ustawieniach Safari; sprawdź dropdown/PPM/manager.  
- **App Store Connect**: upload ZIP → TestFlight (screeny i opis).

## 5. Accessibility
- NVDA/VoiceOver: combobox/listbox ogłaszają „n options”; `Esc` zamyka; focus wraca.

## 6. Performance
- DevTools → brak długich tasków >50 ms; heap stabilny ±10% po 60 min intensywnego użycia.
