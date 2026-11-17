export const POLITICAL_CATEGORIES = {
  radicalLeft: { label: 'Izquierda radical', color: '#8E44AD' },
  socialist: { label: 'Socialistas y socialdemócratas', color: '#DC3545' },
  green: { label: 'Ecologistas', color: '#16A6B6' },
  liberal: { label: 'Liberales y centro', color: '#E5B700' },
  conservative: { label: 'Conservadores y democristianos', color: '#2563B8' },
  nationalist: { label: 'Nacionalistas no clasificados como derecha radical', color: '#C77732' },
  radicalRight: { label: 'Derecha radical y ultraderecha', color: '#23864B' },
  pending: { label: 'Sin clasificación fiable', color: '#9299A3' }
} as const;

export type PoliticalCategory = keyof typeof POLITICAL_CATEGORIES;
export type VerifiedStatus = 'validated' | 'pending' | 'insufficient';
export const CATEGORY_KEYS = Object.keys(POLITICAL_CATEGORIES) as PoliticalCategory[];
