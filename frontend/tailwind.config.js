/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0faf4',
          100: '#d6efdf',
          200: '#aeddbe',
          300: '#77c898',
          400: '#43ad73',
          500: '#249258',
          600: '#1a7548',
          700: '#166040',
          800: '#134e33',
          900: '#1a3c2e',
          950: '#0f2419',
        },
        brand: '#1a3c2e',
        accent: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
