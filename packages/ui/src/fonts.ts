/**
 * Brand fonts via `next/font/google`.
 * Imported by apps/web's root layout. Exposes CSS vars --font-tajawal, --font-inter, --font-jetbrains.
 */

import { Tajawal, Inter, JetBrains_Mono } from 'next/font/google';

export const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  variable: '--font-tajawal',
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
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const fontVariables = [
  tajawal.variable,
  inter.variable,
  jetbrainsMono.variable,
].join(' ');
