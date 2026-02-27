import type { NetSuiteErrorDetail } from '../types/errors.js';

/**
 * Parse a NetSuite error response body into a structured format.
 */
export function parseNetSuiteError(error: unknown): {
  message: string;
  code?: string;
  details?: NetSuiteErrorDetail;
} {
  if (!error || typeof error !== 'object') {
    return { message: String(error) };
  }

  const e = error as Record<string, unknown>;

  // Standard NetSuite REST API error format
  if (e.title || e.detail) {
    return {
      message: String(e.detail ?? e.title ?? 'Unknown error'),
      code: e['o:errorCode'] as string | undefined,
      details: e as NetSuiteErrorDetail,
    };
  }

  // Fallback for other error formats
  if (e.message) {
    return {
      message: String(e.message),
      code: e.code as string | undefined,
    };
  }

  return { message: JSON.stringify(error) };
}
