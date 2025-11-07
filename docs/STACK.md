# STACK — NativeFill (nowoczesny, Rust‑leaning)

## Podsumowanie
- **WXT** — wieloprzeglądarkowy framework (Chrome/Edge/Firefox/Safari, MV2/MV3 routing).  
- **webextension‑polyfill** — jednolity `browser.*` API.  
- **Biome** + **Oxlint** — szybki formatter/linter (Rust).  
- **Lightning CSS** — szybkie CSS (Rust).  
- **Playwright** + **web‑ext** — E2E (Chromium/Firefox/WebKit) + packaging FF.  
- **Xcode/App Store Connect** — packaging Safari (macOS + iOS).

## Polecenia (bez kodu — tylko intencje)
- Dev: `wxt dev -b chrome` / `-b firefox` / `-b safari`  
- Build: `wxt build -b chrome --mv3`, `wxt build -b firefox`, `wxt build -b safari`  
- FF run/pack: `web-ext run` / `web-ext build`  
- Safari convert: `xcrun safari-web-extension-converter ./dist/safari` *(lub App Store Connect upload ZIP)*
