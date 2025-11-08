# NativeFill

**Privacy-first form autofill with native-like suggestions and right-click menu.**

## Features

- ⚡ **Instant suggestions** while typing (supports `textarea`)
- 🖱️ **Context menu fill** (right-click menu)
- 🗂️ **Organized data** with folders, profiles, tags, and aliases
- 🔐 **Privacy by default**: local storage only (no cloud sync/backup)
- 🌍 **Multi-browser**: Chrome/Edge/Firefox/Safari (macOS + iOS)
- ⚙️ **Domain rules**: customize behavior per website
- 🚀 **WASM fuzzy matching**: sub-3ms search across 5k items

## Tech Stack

- **WXT** (multi-target build, auto-manifest generation)
- **webextension-polyfill** (`browser.*` API)
- **Rust → WASM** (fuzzy matching with TypeScript fallback)
- **Biome** (formatter + linter, Rust-based)
- **Lightning CSS** (CSS processing, Rust-based)
- **Playwright** + **Vitest** (testing)

## Architecture

### Extension Components
- **Background**: Service Worker (Chrome/Edge) / Event Page (Firefox) — storage, context menus, messaging
- **Content Script**: dropdown UI (Shadow DOM), keyboard handling, field detection
- **Options/Popup**: data management, settings, quick actions

### Data Model

```typescript
{
  "items": [
    {
      "id": "uuid",
      "label": "Work Email",
      "value": "konrad@example.com",
      "type": "singleline|multiline",
      "tags": ["email", "work"],
      "aliases": ["mail", "work mail"],
      "profile": "Work",
      "folder": "Contacts"
    }
  ],
  "domainRules": [
    {
      "pattern": "*.linkedin.com",
      "includeFolders": ["Work"],
      "excludeFolders": ["Personal"],
      "boostTags": ["job", "outreach"],
      "disableOnHost": false
    }
  ],
  "settings": {
    "shortcuts": {
      "openDropdown": "Alt+J",
      "forceDropdown": "Alt+ArrowDown"
    },
    "theme": "system|dark|light",
    "maxSuggestions": 6
  }
}
```

## Build & Development

### Prerequisites
```bash
bun install
```

### Development
```bash
bun run dev:chrome    # Chrome/Edge with live reload
bun run dev:firefox   # Firefox with live reload
bun run dev:safari    # Safari with live reload
```

### Production Build
```bash
bun run build:chrome  # Chrome MV3 build
bun run build:edge    # Edge MV3 build
bun run build:firefox # Firefox Event Page build
bun run build:safari  # Safari WebExtension build
bun run build:all     # All browsers
```

### Firefox Packaging
```bash
bun run pack:ff       # Creates .xpi in artifacts/
```

### Safari Packaging
```bash
# macOS/iOS via Xcode:
xcrun safari-web-extension-converter ./dist/safari

# Or upload ZIP to App Store Connect for TestFlight distribution
```

## Testing

```bash
bun run check              # Biome lint + TypeScript check
bun run test:unit          # Unit tests (UT-001 to UT-006)
bun run test:integration   # Integration tests (IT-001 to IT-006)
bun run test:e2e           # E2E tests (TP-001 to TP-012)
bun run test               # All tests
```

See [TESTING.md](docs/TESTING.md) for detailed test specifications and manual checklists.

## Security & Privacy

- **No telemetry** or analytics
- **Local storage only** (`storage.local`) — no cloud sync
- **Minimal permissions**: `storage`, `contextMenus`, `activeTab`, `scripting`
- **No sensitive fields**: password/cc/cvv/iban fields are never autofilled
- **XSS protection**: imported data is sanitized

See [SECURITY.md](docs/SECURITY.md) for security policy and [PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md) for details.

## Performance

- Dropdown appears **≤150ms** after typing
- Fuzzy matching **≤3ms** for 5k items (WASM)
- Render time **≤4ms**
- Bundle size **<250KB** gzipped
- No long tasks >50ms in content script

## Browser Support

| Browser | Version | Manifest | Notes |
|---------|---------|----------|-------|
| Chrome/Edge | ≥88 | MV3 | Service Worker |
| Firefox | ≥109 | MV3 | Event Page |
| Safari macOS | ≥14 | WebExtension | via Xcode converter |
| Safari iOS | ≥15 | WebExtension | TestFlight or App Store |

## Roadmap

- **v2.1** (current): Domain rules, WASM fuzzy-match, multi-browser support
- **v2.2** (planned): Variable templates (`{{firstName}}`, `{{today}}`), Side Panel UI, enhanced context menu search
- **v2.3** (future): Improved field detection heuristics, i18n (10+ languages)

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for development guidelines.

## Publishing

See [PUBLISHING.md](docs/PUBLISHING.md) for store submission guidelines and [CWS_Listing.md](docs/CWS_Listing.md) for Chrome Web Store metadata.

## License

MIT
