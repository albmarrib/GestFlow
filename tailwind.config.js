/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta corporativa Ferrer Assessoria (Sage Green / Petroleum Teal)
        indigo: {
          50: '#f3f8f6',
          100: '#e3efe9',
          200: '#c7dfd5',
          300: '#9ec7b7',
          400: '#76ad99',
          500: '#5C9682',
          600: '#497a69',
          700: '#3b6355',
          800: '#2e4d43',
          900: '#143C3C',
          950: '#152427',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'premium': '0 10px 30px -5px rgba(21, 36, 39, 0.05), 0 4px 10px -2px rgba(21, 36, 39, 0.03)',
        'premium-hover': '0 20px 40px -10px rgba(92, 150, 130, 0.14), 0 8px 16px -4px rgba(21, 36, 39, 0.05)',
        'glow-indigo': '0 0 20px -3px rgba(92, 150, 130, 0.35)',
      }
    },
  },
  plugins: [],
}
