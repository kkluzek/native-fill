# Checklisty manualne — NativeFill v2.1

## 1. Safari macOS (MAN-001)
1. Zbuduj `wxt build -b safari` → `dist/safari`.
2. Uruchom `xcrun safari-web-extension-converter dist/safari --macos-only --project-location tmp/nativefill-safari`.
3. Otwórz projekt w Xcode, zaktualizuj `Bundle Identifier`.
4. Uruchom rozszerzenie w Safari:
   - Włącz „Allow Unsigned Extensions”.
   - Aktywuj NativeFill w Preferencjach.
5. Testy funkcjonalne:
   - Dropdown ≤150 ms, skróty `Alt+J`, `Esc`, `Enter`.
   - Menu PPM (foldery, elementy).
   - Options UI CRUD (import/export JSON).
   - Domain Rules „Disable on this host”.
6. Zapisz logi konsoli; brak błędów.
7. Raportuj wynik + zrzuty ekranu.

## 2. Safari iOS (MAN-002)
1. Zbuduj Xcode archive → zainstaluj na urządzeniu/testflight.
2. W Ustawieniach > Safari > Rozszerzenia włącz NativeFill.
3. Przetestuj:
   - Dropdown (klawiatura ekranowa), PPM (long-press context menu).
   - Options mini UI (jeśli wspierane) lub dedykowany ekran.
   - Import/eksport przez pliki.
4. Sprawdź uprawnienia (brak żądań dodatkowych).
5. Udokumentuj screen recording + notatki.

## 3. Dostępność (MAN-003)
### VoiceOver (macOS)
1. Włącz VoiceOver (`Cmd+F5`).
2. Na polu tekstowym wpisz znak → oczekuj ogłoszenia „lista X elementów”.
3. `VO+↓`/`↑` przechodzi po opcjach; `Esc` zamyka dropdown i focus wraca.
4. Options UI: heading structure, `aria-live="polite"` przy zapisie.

### NVDA (Windows/Firefox/Chrome)
1. Włącz NVDA.
2. Kroki analogiczne; upewnij się, że listbox zgłasza `aria-activedescendant`.
3. Sprawdź popup: tab order, wyraźne etykiety.
4. Raportuj wynik + ewentualne bugi.

## 4. Publikacje sklepowe (MAN-004/005)
1. **App Store Connect/TestFlight**:
   - Uzupełnij listing (opis, privacy, kontakt).
   - Upload ZIP → sprawdź walidację.
   - Dodaj screenshoty i notatki testowe.
2. **Chrome Web Store / Edge Add-ons**:
   - ZIP z `dist/chrome`/`dist/edge`.
   - Formularz: permissions (storage/contextMenus/activeTab/scripting), brak Sync/backup.
   - Smoke w Canary/Edge Dev po publikacji.
