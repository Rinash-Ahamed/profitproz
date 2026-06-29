/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Base surfaces - pure, no gradients blending
        zinc: {
          1000: '#09090B',
          950: '#0C0C0F',
          900: '#111113',
          800: '#1C1C1F',
          700: '#27272A',
          600: '#3F3F46',
        },
        // Single hero accent
        blue: {
          600: '#2563EB',
          500: '#3B82F6',
          400: '#60A5FA',
          muted: 'rgba(59,130,246,0.12)',
          border: 'rgba(59,130,246,0.25)',
        },
        // Semantic
        ink: '#FAFAFA',
        sub: '#A1A1AA',
        ghost: '#52525B',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-instrument)', 'Georgia', 'serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
      },
      animation: {
        'ticker': 'ticker 28s linear infinite',
        'ticker-rev': 'ticker-rev 32s linear infinite',
        'blink': 'blink 1.2s step-end infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'ticker-rev': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.8)' },
        },
      },
    },
  },
  plugins: [],
}
