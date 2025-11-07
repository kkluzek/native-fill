# Bezpieczeństwo — NativeFill

- Minimalne uprawnienia: `storage`, `contextMenus`, `activeTab`, `scripting`; `identity` tylko po włączeniu backupu.  
- **Brak telemetrii.**  
- Wykluczenia pól: password/cc/cvv/iban/pesel — **nie** podpowiadamy ani nie wypełniamy.  
- (Opcjonalnie) szyfrowanie lokalne: AES‑GCM (256), klucz z PBKDF2/scrypt; klucz nie trafia na dysk.
