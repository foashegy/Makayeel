/**
 * Brand fonts via `next/font/google`.
 * Imported by apps/web's root layout. Exposes CSS vars --font-tajawal, --font-inter, --font-jetbrains.
 */

import { Tajawal, Cairo, Inter, JetBrains_Mono } from 'next/font/google';

export const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  variable: '--font-tajawal',
  display: 'swap',
});

// Cairo Black (900) for headlines — gives Arabic data displays the
// authoritative weight Tajawal 700 lacks. See brand-design.md.
export const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
});

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const fontVariables = [
  tajawal.variable,
  cairo.variable,
  inter.variable,
  jetbrainsMono.variable,
].join(' ');
