/**
 * Makayeel — brand design tokens
 * Exact hexes from the project brief — do not improvise.
 * Keep in sync with packages/config/tailwind/preset.js and globals.css vars.
 */

export const colors = {
  wheatGold: '#D4A24C',
  deepNavy: '#1A2E40',
  harvestGreen: '#6BA368',
  cream: '#F5EFE0',
  charcoal: '#2A2A2A',
  paperWhite: '#FAFAF5',
  alertRed: '#C44545',
} as const;

export type BrandColor = keyof typeof colors;

export const fonts = {
  arabic: 'Tajawal',
  latin: 'Inter',
  mono: 'JetBrains Mono',
} as const;

export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const spacing = {
  container: '72rem',
  radius: '1rem',
} as const;
