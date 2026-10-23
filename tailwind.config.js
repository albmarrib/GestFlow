/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'premium': '0 10px 30px -5px rgba(0, 0, 0, 0.04), 0 4px 10px -2px rgba(0, 0, 0, 0.02)',
        'premium-hover': '0 20px 40px -10px rgba(79, 70, 229, 0.09), 0 8px 16px -4px rgba(0, 0, 0, 0.04)',
        'glow-indigo': '0 0 20px -3px rgba(99, 102, 241, 0.3)',
      }
    },
  },
  plugins: [],
}
