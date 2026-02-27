/**
 * Normalize a NetSuite account ID for use in API URLs.
 * Sandbox accounts use underscore format (e.g., "1234567_SB1")
 * but URLs require hyphens (e.g., "1234567-sb1").
 */
export function normalizeAccountId(accountId: string): string {
  return accountId.toLowerCase().replace(/_/g, '-');
}

/** Build the SuiteTalk REST API base URL */
export function buildSuiteTalkUrl(accountId: string): string {
  return `https://${normalizeAccountId(accountId)}.suitetalk.api.netsuite.com`;
}

/** Build the RESTlet base URL */
export function buildRestletUrl(accountId: string): string {
  return `https://${normalizeAccountId(accountId)}.restlets.api.netsuite.com`;
}
