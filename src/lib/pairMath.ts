/**
 * Pure, Client-Safe Currency Pair Math & Precision Utilities
 * Safe to import in both Client Components and Server Components.
 */

export function getPipSize(symbol: string): number {
  if (!symbol) return 0.0001;
  const s = symbol.toUpperCase();
  if (s.includes('JPY')) return 0.01;
  if (s.includes('XAU') || s === 'GC=F' || s.includes('GOLD')) return 0.1;
  if (s.includes('US30') || s.includes('SPX') || s.includes('NAS')) return 1.0;
  return 0.0001;
}

export function getPairDecimals(symbol: string): number {
  if (!symbol) return 5;
  const s = symbol.toUpperCase();
  if (s.includes('JPY')) return 3;
  if (s.includes('XAU') || s === 'GC=F' || s.includes('GOLD')) return 2;
  if (s.includes('US30') || s.includes('SPX') || s.includes('NAS')) return 1;
  return 5;
}
