# Repository Guidelines

## Project Structure & Module Organization
- `docs/` — product docs, security, publishing, test plans.
- `assets/` — icons and branding used in bundles.
- `src/` (when present) — WXT extension code. Typical layout: `background/`, `content/`, `options/`, `popup/`.
- `tests/` — Playwright specs (`*.spec.ts`).
- Build output: `dist/<browser>` (e.g., `dist/firefox`).

## Build, Test, and Development Commands
- `bun install` — install dependencies.
- `bun run dev:chrome|edge|firefox|safari` — WXT dev server with live-reload in target browser.
- `bun run build:chrome|edge|firefox|safari` — production builds; `bun run build:all` builds all.
- `bun run pack:ff` — package Firefox `.xpi` from `dist/firefox` into `artifacts/`.
- `bun run test:install` — install Playwright browsers.
- `bun run test` — run E2E tests.

## Coding Style & Naming Conventions
- Formatter/Linter: Biome only. Run `bun run check`, `bun run format`, `bun run lint` before PRs.
- Language: TypeScript + ES Modules (`"type": "module"`).
- Indent 2 spaces; prefer explicit types for public APIs.
- Filenames: kebab-case (`form-manager.ts`); Types/Classes: PascalCase; variables: camelCase; constants: UPPER_SNAKE_CASE.

## Testing Guidelines
- Framework: Playwright (Chromium/Firefox/WebKit). Name specs `tests/*.spec.ts`.
- Write idempotent, cross-browser tests; prefer `data-testid` hooks.
- Record traces/video on failures (Playwright default). Examples:
  - `bun run test -- --project=firefox`
  - `bun run test -- -g "TP-001"`

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `perf:`, `build:`, `ci:`.
- PRs must include: clear description and scope, linked issues, before/after screenshots or short screencast for UI.
- Non-negotiables: no telemetry, keep bundle < 250 KB, maintain WCAG AA for UI surfaces.

## Security & Configuration Tips
- Copy envs from `cp .env.example .env`; never commit secrets.
- Minimal permissions: `storage`, `contextMenus`, `activeTab`, `scripting` — brak `identity` i brak chmurowych backupów.
- Never autofill sensitive fields (password/cc/cvv/iban). See `docs/SECURITY.md` for details.
