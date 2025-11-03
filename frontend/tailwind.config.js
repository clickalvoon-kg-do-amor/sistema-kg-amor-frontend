/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    // Esta linha garante que o Tailwind vai ler TODOS os seus arquivos
    "./src/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}