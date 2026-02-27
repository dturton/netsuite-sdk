import type { NetSuiteConfig } from '../types/config.js';

/** Validate a NetSuiteConfig and return an array of error messages (empty = valid). */
export function validateConfig(config: unknown): string[] {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    return ['Config must be a non-null object'];
  }

  const c = config as Record<string, unknown>;

  // auth
  if (!c.auth || typeof c.auth !== 'object') {
    errors.push('auth is required and must be an object');
  } else {
    const auth = c.auth as Record<string, unknown>;
    const requiredFields = ['consumerKey', 'consumerSecret', 'tokenKey', 'tokenSecret', 'realm'];
    for (const field of requiredFields) {
      if (!auth[field] || typeof auth[field] !== 'string') {
        errors.push(`auth.${field} is required and must be a non-empty string`);
      }
    }
  }

  // accountId
  if (!c.accountId || typeof c.accountId !== 'string') {
    errors.push('accountId is required and must be a non-empty string');
  }

  return errors;
}
