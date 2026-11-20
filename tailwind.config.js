/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        radar: {
          bg: '#0a0e17',
          surface: '#111827',
          panel: '#151d2e',
          card: '#1b253b',
          border: '#22314e',
          grid: '#182438',
          accent: '#06b6d4',
          alert: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981',
          cancelled: '#64748b'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
