/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nephro: {
          dark: '#0d3d2b',
          primary: '#1a6b4a',
          light: '#2d8f6a',
          accent: '#a8d96c',
          accentLight: '#c5e877',
          bg: '#f0f7ee',
        }
      }
    },
  },
  plugins: [],
}
