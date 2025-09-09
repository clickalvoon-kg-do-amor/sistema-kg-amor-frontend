/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./public/index.html",         // importante para Vite
    "./src/**/*.{js,ts,jsx,tsx}"   // analisa todos os arquivos TS/TSX
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
