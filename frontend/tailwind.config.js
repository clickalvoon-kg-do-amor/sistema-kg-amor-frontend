/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    // Esta linha corrige o design
    "./src/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}