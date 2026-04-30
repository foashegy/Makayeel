import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx,js,jsx,mdx}',
    '../../packages/ui/src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        'wheat-gold': '#D4A24C',
        'deep-navy': '#1A2E40',
        'harvest-green': '#6BA368',
        cream: '#F5EFE0',
        charcoal: '#2A2A2A',
        'paper-white': '#FAFAF5',
        'alert-red': '#C44545',
        brand: {
          DEFAULT: '#D4A24C',
          50: '#FBF6EC',
          100: '#F5E9CC',
          200: '#EBD49A',
          300: '#E0BE68',
          400: '#D4A24C',
          500: '#B5883A',
          600: '#8E6A2A',
          700: '#6B4F1F',
          800: '#493615',
          900: '#2B200C',
        },
        navy: {
          DEFAULT: '#1A2E40',
          50: '#E6EBF0',
          100: '#C2CCD6',
          200: '#8FA0B3',
          300: '#5B748F',
          400: '#2F4B68',
          500: '#1A2E40',
          600: '#152535',
          700: '#101C27',
          800: '#0A121A',
          900: '#05090D',
        },
      },
      fontFamily: {
        arabic: ['var(--font-tajawal)', 'Tajawal', 'system-ui', 'sans-serif'],
        display: ['var(--font-cairo)', 'Cairo', 'var(--font-tajawal)', 'Tajawal', 'system-ui', 'sans-serif'],
        latin: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,46,64,0.04), 0 4px 12px rgba(26,46,64,0.05)',
        'card-hover': '0 4px 8px rgba(26,46,64,0.08), 0 8px 24px rgba(26,46,64,0.08)',
      },
      borderRadius: {
        xl2: '1.125rem',
      },
      maxWidth: {
        content: '72rem',
      },
    },
  },
  plugins: [],
};

export default config;
