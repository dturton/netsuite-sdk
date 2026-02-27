import { describe, it, expect } from 'vitest';
import {
  normalizeAccountId,
  buildSuiteTalkUrl,
  buildRestletUrl,
} from '../../utils/url-builder.js';

describe('normalizeAccountId', () => {
  it('lowercases the account ID', () => {
    expect(normalizeAccountId('TSTDRV1234')).toBe('tstdrv1234');
  });

  it('replaces underscores with hyphens', () => {
    expect(normalizeAccountId('1234567_SB1')).toBe('1234567-sb1');
  });

  it('handles already normalized IDs', () => {
    expect(normalizeAccountId('1234567')).toBe('1234567');
  });
});

describe('buildSuiteTalkUrl', () => {
  it('builds correct SuiteTalk URL', () => {
    expect(buildSuiteTalkUrl('1234567')).toBe(
      'https://1234567.suitetalk.api.netsuite.com',
    );
  });

  it('normalizes sandbox account IDs', () => {
    expect(buildSuiteTalkUrl('1234567_SB1')).toBe(
      'https://1234567-sb1.suitetalk.api.netsuite.com',
    );
  });
});

describe('buildRestletUrl', () => {
  it('builds correct RESTlet URL', () => {
    expect(buildRestletUrl('1234567')).toBe(
      'https://1234567.restlets.api.netsuite.com',
    );
  });
});
