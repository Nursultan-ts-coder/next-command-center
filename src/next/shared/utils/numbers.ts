import clamp from 'lodash/clamp';
import lodashRound from 'lodash/round';

export function round(value: number | undefined | null): number {
  if (value == null || isNaN(value)) return 0;
  return Math.round(value);
}
export function compactNumber(value: number): string {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatUSNumber(value: number | string | null | undefined): string {
  if (value == null) return '0';

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) return '0';

  return new Intl.NumberFormat('en-US').format(numValue);
}

export const getPercentage = (value: number = 0, total: number = 0): number => {
  if (total === 0 || value === 0) return 0;
  return clamp(lodashRound((value / total) * 100), 0, 100);
};
export const parseNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;

  const cleaned = String(value).replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);

  return isNaN(parsed) ? 0 : parsed;
};
