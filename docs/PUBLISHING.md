# PUBLISHING — NativeFill v2.1

## Chrome Web Store / Edge Add‑ons
- Buduj: `wxt build -b chrome --mv3` i `-b edge --mv3` → wgraj ZIP z `dist/nativefill`.  
- Wypełnij listing z `CWS_Listing.md` (dopisz Domain Rules + WASM).

## Firefox Add‑ons (AMO)
- `web-ext build` (źródło `dist/firefox`) → powstaje **.xpi**; dołącz `browser_specific_settings.gecko.id`.  
- (Opcjonalnie) `web-ext sign` z danymi AMO.

## Safari (macOS + iOS)
- **Opcja A (Xcode)**: `xcrun safari-web-extension-converter ./dist/safari` → projekt Xcode → build/run.  
- **Opcja B (App Store Connect)**: upload ZIP (Apple konwertuje i pakuje) → **TestFlight**.

## Assety
- Zrzuty: 1280×800 (lub 640×400), 3–5 sztuk: dropdown, PPM, manager, options.
