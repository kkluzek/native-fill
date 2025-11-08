export interface ContentScriptDefinition {
  matches: string[];
  runAt?: string;
  main: () => void;
}

export const defineContentScript = (definition: ContentScriptDefinition) => definition;

export default defineContentScript;
