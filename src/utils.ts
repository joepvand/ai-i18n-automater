export type Translations = Record<string, string>;

/**
 * Get a single command line argument value
 */
export function getArg(args: string[], name: string): string | null {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
}

/**
 * Get all instances of a command line argument
 */
export function getAllArgs(args: string[], name: string): string[] {
  const result: string[] = [];
  let index = args.indexOf(name);
  while (index !== -1) {
    const value = args[index + 1];
    if (value && !value.startsWith('--')) result.push(value);
    index = args.indexOf(name, index + 1);
  }
  return result;
}

/**
 * Compare source and existing translations to find missing keys
 */
export function getTranslationDiff(
  source: Translations,
  existing: Translations
): Translations {
  const diff: Translations = {};
  for (const key of Object.keys(source)) {
    if (!(key in existing)) {
      diff[key] = source[key];
    }
  }
  return diff;
}

/**
 * Validate that a translations object has the expected structure
 */
export function validateTranslations(data: any): data is Translations {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false;
  }
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof key !== 'string' || typeof value !== 'string') {
      return false;
    }
  }
  
  return true;
}

/**
 * Create a translation prompt for the AI model
 */
export function createTranslationPrompt(
  fullJson: Translations,
  targetLang: string,
  reasoning: boolean = false
): string {
  let instruction = `
    [no prose]
    [Output only JSON]
    You are a translation assistant. Translate only the values in the following JSON object from English to ${targetLang}. Keep the keys and structure identical. Return valid JSON only. DO NOT PERFORM FORMATTING, PROVIDE RAW JSON TEXT ONLY`;
  
  if (!reasoning) {
    instruction = '/no-think ' + instruction;
  }

  return `${instruction}\n\n${JSON.stringify(fullJson, null, 2)}`;
}