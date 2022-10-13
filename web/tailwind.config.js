/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    screens: {
      sm: "480px",
      md: "768px",
      lg: "976px",
      xl: "1440px",
    },
    fontFamily: {
      poppins: ["Poppins", "sans-serif"],
    },
    extend: {
      colors: {
        transparent: "transparent",
        current: "currentColor",
        light: {
          DEFAULT: "#7e7e8f",
        },
        primary: {
          DEFAULT: "#7d56fd",
          light: "#dbd3f7",
          lighter: "#BCE9E4",
          disabled: "#EDF8F6",
        },
      },
    },
  },
  plugins: [],
};
