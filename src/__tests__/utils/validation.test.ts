import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../utils/validation.js';

const validConfig = {
  auth: {
    consumerKey: 'ck',
    consumerSecret: 'cs',
    tokenKey: 'tk',
    tokenSecret: 'ts',
    realm: 'REALM',
  },
  accountId: '1234567',
};

describe('validateConfig', () => {
  it('returns empty array for valid config', () => {
    expect(validateConfig(validConfig)).toEqual([]);
  });

  it('returns error for null config', () => {
    const errors = validateConfig(null);
    expect(errors).toContain('Config must be a non-null object');
  });

  it('returns error for undefined config', () => {
    const errors = validateConfig(undefined);
    expect(errors).toContain('Config must be a non-null object');
  });

  it('returns error for missing auth', () => {
    const errors = validateConfig({ accountId: '1234567' });
    expect(errors).toContain('auth is required and must be an object');
  });

  it('returns error for missing auth fields', () => {
    const errors = validateConfig({
      auth: { consumerKey: 'ck' },
      accountId: '1234567',
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e: string) => e.includes('auth.consumerSecret'))).toBe(true);
    expect(errors.some((e: string) => e.includes('auth.tokenKey'))).toBe(true);
    expect(errors.some((e: string) => e.includes('auth.tokenSecret'))).toBe(true);
    expect(errors.some((e: string) => e.includes('auth.realm'))).toBe(true);
  });

  it('returns error for missing accountId', () => {
    const errors = validateConfig({
      auth: validConfig.auth,
    });
    expect(errors).toContain('accountId is required and must be a non-empty string');
  });

  it('returns error for empty string auth fields', () => {
    const errors = validateConfig({
      auth: {
        consumerKey: '',
        consumerSecret: 'cs',
        tokenKey: 'tk',
        tokenSecret: 'ts',
        realm: 'REALM',
      },
      accountId: '1234567',
    });
    expect(errors.some((e: string) => e.includes('auth.consumerKey'))).toBe(true);
  });

  it('returns multiple errors at once', () => {
    const errors = validateConfig({});
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});
