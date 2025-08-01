import {
  getArg,
  getAllArgs,
  getTranslationDiff,
  validateTranslations,
  createTranslationPrompt,
  type Translations
} from './utils';

describe('getArg', () => {
  it('should return the value after the specified argument', () => {
    const args = ['--apiUrl', 'http://localhost:8080', '--model', 'gpt-4'];
    expect(getArg(args, '--apiUrl')).toBe('http://localhost:8080');
    expect(getArg(args, '--model')).toBe('gpt-4');
  });

  it('should return null if argument is not found', () => {
    const args = ['--apiUrl', 'http://localhost:8080'];
    expect(getArg(args, '--missing')).toBeNull();
  });

  it('should return null if argument is at the end without a value', () => {
    const args = ['--apiUrl', 'http://localhost:8080', '--model'];
    expect(getArg(args, '--model')).toBeUndefined();
  });

  it('should handle empty args array', () => {
    expect(getArg([], '--apiUrl')).toBeNull();
  });

  it('should return the first occurrence when argument appears multiple times', () => {
    const args = ['--model', 'gpt-3.5', '--model', 'gpt-4'];
    expect(getArg(args, '--model')).toBe('gpt-3.5');
  });
});

describe('getAllArgs', () => {
  it('should return all values for a repeated argument', () => {
    const args = ['--to', 'nl', '--to', 'fr', '--to', 'de'];
    expect(getAllArgs(args, '--to')).toEqual(['nl', 'fr', 'de']);
  });

  it('should return empty array if argument is not found', () => {
    const args = ['--apiUrl', 'http://localhost:8080'];
    expect(getAllArgs(args, '--to')).toEqual([]);
  });

  it('should skip values that start with --', () => {
    const args = ['--to', 'nl', '--to', '--apiUrl', '--to', 'fr'];
    expect(getAllArgs(args, '--to')).toEqual(['nl', 'fr']);
  });

  it('should handle empty args array', () => {
    expect(getAllArgs([], '--to')).toEqual([]);
  });

  it('should handle single occurrence', () => {
    const args = ['--to', 'nl', '--model', 'gpt-4'];
    expect(getAllArgs(args, '--to')).toEqual(['nl']);
  });

  it('should handle argument at the end without value', () => {
    const args = ['--to', 'nl', '--to'];
    expect(getAllArgs(args, '--to')).toEqual(['nl']);
  });
});

describe('getTranslationDiff', () => {
  it('should return keys that exist in source but not in existing', () => {
    const source: Translations = {
      'key1': 'value1',
      'key2': 'value2',
      'key3': 'value3'
    };
    const existing: Translations = {
      'key1': 'existing1',
      'key3': 'existing3'
    };
    
    const diff = getTranslationDiff(source, existing);
    expect(diff).toEqual({ 'key2': 'value2' });
  });

  it('should return empty object when all keys exist', () => {
    const source: Translations = {
      'key1': 'value1',
      'key2': 'value2'
    };
    const existing: Translations = {
      'key1': 'existing1',
      'key2': 'existing2',
      'key3': 'existing3'
    };
    
    const diff = getTranslationDiff(source, existing);
    expect(diff).toEqual({});
  });

  it('should return all keys when existing is empty', () => {
    const source: Translations = {
      'key1': 'value1',
      'key2': 'value2'
    };
    const existing: Translations = {};
    
    const diff = getTranslationDiff(source, existing);
    expect(diff).toEqual(source);
  });

  it('should handle empty source', () => {
    const source: Translations = {};
    const existing: Translations = {
      'key1': 'existing1'
    };
    
    const diff = getTranslationDiff(source, existing);
    expect(diff).toEqual({});
  });

  it('should preserve original values from source', () => {
    const source: Translations = {
      'key1': 'source_value',
      'key2': 'another_source_value'
    };
    const existing: Translations = {
      'key1': 'different_value'
    };
    
    const diff = getTranslationDiff(source, existing);
    expect(diff).toEqual({ 'key2': 'another_source_value' });
  });
});

describe('validateTranslations', () => {
  it('should return true for valid translations object', () => {
    const valid: Translations = {
      'key1': 'value1',
      'key2': 'value2'
    };
    expect(validateTranslations(valid)).toBe(true);
  });

  it('should return true for empty object', () => {
    expect(validateTranslations({})).toBe(true);
  });

  it('should return false for null', () => {
    expect(validateTranslations(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(validateTranslations(undefined)).toBe(false);
  });

  it('should return false for arrays', () => {
    expect(validateTranslations(['key1', 'value1'])).toBe(false);
  });

  it('should return true for numeric keys (converted to strings)', () => {
    // In JavaScript, numeric keys are automatically converted to strings
    const valid = { 123: 'value1' };
    expect(validateTranslations(valid)).toBe(true);
  });

  it('should return false for non-string values', () => {
    const invalid = { 'key1': 123 };
    expect(validateTranslations(invalid)).toBe(false);
  });

  it('should return false for nested objects', () => {
    const invalid = { 'key1': { 'nested': 'value' } };
    expect(validateTranslations(invalid)).toBe(false);
  });

  it('should return false for primitive values', () => {
    expect(validateTranslations('string')).toBe(false);
    expect(validateTranslations(123)).toBe(false);
    expect(validateTranslations(true)).toBe(false);
  });
});

describe('createTranslationPrompt', () => {
  const sampleJson: Translations = {
    'common.ok': 'OK',
    'common.cancel': 'Cancel'
  };

  it('should create prompt with correct target language', () => {
    const prompt = createTranslationPrompt(sampleJson, 'French');
    expect(prompt).toContain('from English to French');
  });

  it('should include the JSON data in the prompt', () => {
    const prompt = createTranslationPrompt(sampleJson, 'French');
    expect(prompt).toContain('"common.ok": "OK"');
    expect(prompt).toContain('"common.cancel": "Cancel"');
  });

  it('should include no-think directive when reasoning is false', () => {
    const prompt = createTranslationPrompt(sampleJson, 'French', false);
    expect(prompt).toContain('/no-think');
  });

  it('should not include no-think directive when reasoning is true', () => {
    const prompt = createTranslationPrompt(sampleJson, 'French', true);
    expect(prompt).not.toContain('/no-think');
  });

  it('should default reasoning to false', () => {
    const prompt = createTranslationPrompt(sampleJson, 'French');
    expect(prompt).toContain('/no-think');
  });

  it('should include standard instructions', () => {
    const prompt = createTranslationPrompt(sampleJson, 'French');
    expect(prompt).toContain('[no prose]');
    expect(prompt).toContain('[Output only JSON]');
    expect(prompt).toContain('Keep the keys and structure identical');
    expect(prompt).toContain('Return valid JSON only');
  });

  it('should handle different target languages', () => {
    const languages = ['Spanish', 'German', 'Dutch', 'Italian'];
    languages.forEach(lang => {
      const prompt = createTranslationPrompt(sampleJson, lang);
      expect(prompt).toContain(`from English to ${lang}`);
    });
  });

  it('should handle empty translations object', () => {
    const prompt = createTranslationPrompt({}, 'French');
    expect(prompt).toContain('{}');
    expect(prompt).toContain('from English to French');
  });
});