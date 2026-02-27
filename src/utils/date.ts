/**
 * Format a Date as a NetSuite date string (YYYY-MM-DD).
 */
export function formatNetSuiteDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a NetSuite date string (YYYY-MM-DD or MM/DD/YYYY) into a Date.
 */
export function parseNetSuiteDate(dateString: string): Date {
  // Handle MM/DD/YYYY format
  if (dateString.includes('/')) {
    const [month, day, year] = dateString.split('/');
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  // Handle YYYY-MM-DD format
  const [year, month, day] = dateString.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day));
}
