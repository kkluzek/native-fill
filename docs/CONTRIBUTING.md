# CONTRIBUTING — NativeFill

- **Package manager:** Bun.  
- **Format/Lint:** Biome (jedyny).  
- **Testy:** Playwright (Chromium/Firefox/WebKit).  
- **Buildy:** WXT (Chrome/Edge/Firefox/Safari), `web-ext` dla FF.

### Skrypty (patrz `package.json`)
- `bun run check` — Biome check  
- `bun run test:install` → Playwright browsers  
- `bun run test` → E2E  
- `bun run build:all` → cztery buildy naraz

**Zasady PR:** zero telemetrii, trzymaj bundle < 250 KB, utrzymuj a11y AA.
