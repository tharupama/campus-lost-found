/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4f3',
          100: '#fae8e4',
          200: '#f5cfc5',
          300: '#eead9c',
          400: '#e5816a',
          500: '#d55a3c',
          600: '#ad3a20',
          700: '#85200f',
          800: '#5c100b',
          900: '#450a07',
          950: '#2e0604',
        },
        gold: {
          50: '#fefbf2',
          100: '#fcf1d2',
          200: '#f9e3a3',
          300: '#f6d570',
          400: '#f5c73c',
          500: '#f3b619',
          600: '#d49a0c',
          700: '#a97b09',
          800: '#855f0b',
          900: '#6b4c0b',
          950: '#402d06',
        },
        midnight: '#0f172a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        ticket: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 4px 20px -6px rgba(15, 23, 42, 0.12)',
        glow: '0 8px 30px -8px rgba(79, 70, 229, 0.55)',
      },
    },
  },
  plugins: [],
};