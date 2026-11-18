/** Money is integer pence everywhere (docs/architecture.md, Data): never floats. */

const GBP = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

/** 2450 → "£24.50". */
export const formatPrice = (pence: number) => GBP.format(pence / 100);

/** Pence as pounds for a text input, without a needless ".00": 2400 → "24", 2450 → "24.50". */
export function poundsOf(pence: number): string {
  return pence % 100 === 0 ? String(pence / 100) : (pence / 100).toFixed(2);
}

/**
 * Pounds as typed ("24", "24.5", "£24.50") in pence; `null` for empty, `undefined`
 * for something that isn't a price.
 */
export function penceOf(text: string): number | null | undefined {
  const trimmed = text.trim().replace(/^£/, '');
  if (trimmed === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return undefined;
  const [pounds = '0', fraction = ''] = trimmed.split('.');
  return Number(pounds) * 100 + Number(fraction.padEnd(2, '0'));
}
