/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        surface: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          700: "#1c1917",
          800: "#141211",
          900: "#0c0a09",
          950: "#080706",
        },
      },
    },
  },
  plugins: [],
};
