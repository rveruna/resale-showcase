import { formatPrice, penceOf, poundsOf } from './money';

describe('money', () => {
  it('formats pence as pounds', () => {
    expect(formatPrice(2450)).toBe('£24.50');
    expect(formatPrice(100000)).toBe('£1,000.00');
  });

  it('writes whole pounds without decimals for the form', () => {
    expect(poundsOf(2400)).toBe('24');
    expect(poundsOf(2450)).toBe('24.50');
    expect(poundsOf(5)).toBe('0.05');
  });

  it.each([
    ['24', 2400],
    ['24.5', 2450],
    ['24.50', 2450],
    ['£0.99', 99],
    ['  12 ', 1200],
  ])('reads %p as %p pence', (text, pence) => {
    expect(penceOf(text)).toBe(pence);
  });

  it('reads empty as no price and rejects what is not a price', () => {
    expect(penceOf('')).toBeNull();
    expect(penceOf('12.345')).toBeUndefined();
    expect(penceOf('twelve')).toBeUndefined();
    expect(penceOf('-3')).toBeUndefined();
  });
});
