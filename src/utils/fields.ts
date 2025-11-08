const DISALLOWED_INPUT_TYPES = new Set([
  "password",
  "hidden",
  "file",
  "checkbox",
  "radio",
  "submit",
  "button"
]);

const SENSITIVE_PATTERN = /(password|passcode|pass|secret|otp|cvv|iban|card|credit|ssn|pesel|tax|pin)/i;
const BLOCKED_AUTOCOMPLETES = new Set(["off", "new-password", "cc-number", "cc-csc"]);

export const isSensitiveField = (element: Element | null): boolean => {
  if (!element) return false;
  const label = `${element.getAttribute("name") ?? ""} ${element.getAttribute("id") ?? ""} ${
    element.getAttribute("aria-label") ?? ""
  }`;
  return SENSITIVE_PATTERN.test(label);
};

export const hasBlockedAutocomplete = (element: Element): boolean => {
  const autocomplete = element.getAttribute("autocomplete")?.toLowerCase() ?? "";
  return Boolean(autocomplete && BLOCKED_AUTOCOMPLETES.has(autocomplete));
};

export const isFillableField = (
  element: EventTarget | null
): element is HTMLInputElement | HTMLTextAreaElement => {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    return false;
  }
  if (element instanceof HTMLInputElement && DISALLOWED_INPUT_TYPES.has(element.type)) {
    return false;
  }
  if (isSensitiveField(element)) {
    return false;
  }
  if (hasBlockedAutocomplete(element)) {
    return false;
  }
  return true;
};

export const __testing = {
  DISALLOWED_INPUT_TYPES,
  SENSITIVE_PATTERN,
  BLOCKED_AUTOCOMPLETES
};
