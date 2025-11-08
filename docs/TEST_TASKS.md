# Backlog testowy — NativeFill v2.1

## 1. Jednostkowe (UT)
| ID | Opis | Właściciel | Status |
| --- | --- | --- | --- |
| UT-001 | Testy `resolveDomainRules`: exact, wildcard, `disableOnHost`, boost/include/exclude | QA/FE | DONE (Vitest) |
| UT-002 | Testy `loadState`/`upsertItem`: timestamps, deduplikacja importu, brak zapisu sieci | QA/FE | DONE (Vitest) |
| UT-003 | Testy `fuzzyEngine`: WASM init sukces/porażka, fallback parity, highlight markup | QA/FE | DONE (Vitest) |
| UT-004 | Walidacja pól wrażliwych (`sensitivePattern`, blokady `autocomplete`) | QA/FE | DONE (Vitest) |
| UT-005 | Stress perf (`resolveDomainRules` 10k wpisów) — regresja CPU | QA/FE | TODO |
| UT-006 | Kontrakty typów (`NativeFillMessage`, `NativeFillState`) przez tsd/zod | QA/FE | TODO |

## 2. Integracyjne (IT)
| ID | Opis | Właściciel | Status |
| --- | --- | --- | --- |
| IT-001 | Background SW: `storage.onChanged` → rebuild menu → broadcast | QA/FE | DONE (Vitest) |
| IT-002 | Context menu click => `nativefill:apply-value` (mock `browser.tabs.sendMessage`) | QA/FE | DONE (Vitest) |
| IT-003 | Content script DOM lifecycle + skróty (`Alt+J`, `Alt+↓`, `Esc`) w jsdom | QA/FE | DONE (Vitest) |
| IT-004 | Options CRUD/import/export + live region komunikaty | QA/FE | TODO |
| IT-005 | Popup search ranking oraz wysyłka do aktywnej karty | QA/FE | TODO |
| IT-006 | Wymuszony fallback TS przy błędzie WASM | QA/FE | TODO |

## 3. E2E (Playwright)
| ID | Opis | Przeglądarki | Status |
| --- | --- | --- | --- |
| TP-001 | Sugestie & latencja ≤150 ms, Enter wkleja wartość | Chrom/FF/WebKit | DONE (Playwright harness) |
| TP-002 | Menu PPM, struktura folderów, wklejenie do pola | Chrom/FF/WebKit | DONE (Playwright harness) |
| TP-003 | Współistnienie z autofill Chrome, `Alt+↓` | Chrom | DONE (Playwright harness) |
| TP-004 | Blokada pól wrażliwych (`password`, `cvv`, `pesel`) | Chrom/FF/WebKit | DONE (Playwright harness) |
| TP-005 | Import/eksport JSON i scalanie duplikatów | Chrom/FF/WebKit | TODO |
| TP-006 | Offline storage — brak zapisów poza `storage.local` | Chrom/FF/WebKit | TODO |
| TP-007 | Options UX (`aria-live`, focus) | Chrom/FF/WebKit | TODO |
| TP-008 | Reguły domenowe: wildcard vs exact, `Disable` | Chrom/FF/WebKit | TODO |
| TP-009 | WASM init + fallback TS | Chrom/FF/WebKit | TODO |
| TP-010 | Shadow DOM izolacja na stronie z agresywnym CSS | Chrom/FF/WebKit | TODO |
| TP-011 | Shortcut remap propaguje do content script | Chrom/FF/WebKit | TODO |
| TP-012 | Broadcast danych do otwartych kart | Chrom/FF/WebKit | TODO |

## 4. Manualne
| ID | Opis | Platforma | Status |
| --- | --- | --- | --- |
| MAN-001 | Safari macOS — dropdown, PPM, manager, budowa przez converter | macOS | TODO |
| MAN-002 | Safari iOS — aktywacja, dropdown, PPM, manager | iOS | TODO |
| MAN-003 | VoiceOver/NVDA sesja + raport | macOS/Win | TODO |
| MAN-004 | App Store Connect / TestFlight upload + listing | macOS | TODO |
| MAN-005 | Chrome Web Store/Edge listing smoke | Win/macOS | TODO |
