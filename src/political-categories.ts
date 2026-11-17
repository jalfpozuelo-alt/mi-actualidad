export const POLITICAL_CATEGORIES = {
  progressive: {label: 'Progresista', color: '#D84A52'},
  green: {label: 'Ecologista/verde', color: '#4F9D69'},
  liberal: {label: 'Liberal/centrista', color: '#E0B52B'},
  conservative: {label: 'Conservador', color: '#397BC6'},
  christianDemocratic: {label: 'Democristiano', color: '#7A5AA6'},
  nationalConservative: {label: 'Nacional-conservador', color: '#A56B3F'},
  radicalRight: {label: 'Derecha radical/extrema derecha', color: '#31966B'},
  pending: {label: 'Pendiente de verificación', color: '#9AA0A6'}
} as const;

export type PoliticalCategory = keyof typeof POLITICAL_CATEGORIES;
export type VerifiedStatus = 'validated' | 'pending' | 'insufficient';

export const CATEGORY_KEYS = Object.keys(POLITICAL_CATEGORIES) as PoliticalCategory[];
