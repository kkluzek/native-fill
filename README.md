# NativeFill

**Open‑source, privacy‑first form autofill with native‑like suggestions and a right‑click menu.**

- ⚡ Sugestie podczas pisania (także `textarea`)  
- 🖱️ Wypełnianie z menu kontekstowego (PPM)  
- 🗂️ Foldery, profile, tagi, aliasy  
- 🔐 Prywatność domyślna: wyłącznie storage.local (brak Sync/backup w chmurze)  
- 🌍 **Chrome/Edge/Firefox/Safari (macOS+iOS)**

## Stack
- **WXT** (multi‑target, auto‑manifest)  
- **webextension‑polyfill** (`browser.*`)  
- **Biome** + **Oxlint** (Rust)  
- **Lightning CSS** (Rust)  
- **Playwright** + **web‑ext** (testy)

## Tryby build
- Dev: `wxt dev -b chrome` / `-b firefox` / `-b safari`  
- Build: `wxt build -b chrome --mv3`, `wxt build -b edge --mv3`, `wxt build -b firefox`, `wxt build -b safari`  
- Firefox XPI: `web-ext build`  
- Safari: `xcrun safari-web-extension-converter ./dist/safari` albo upload ZIP do App Store Connect (TestFlight).

## Licencja
MIT
