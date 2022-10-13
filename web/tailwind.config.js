/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      sm: "480px",
      md: "768px",
      lg: "976px",
      xl: "1440px",
    },
    extend: {
      colors: {
        transparent: "transparent",
        current: "currentColor",
        light: {
          DEFAULT: "#7e7e8f",
        },
        primary: {
          DEFAULT: "#3E1DAD",
          light: "#dbd3f7",
          lighter: "#BCE9E4",
          disabled: "#EDF8F6",
        },
        dark_background_color: {
          DEFAULT: "#202023",
        },
        dark_card_background_color: {
          DEFAULT: "#101014",
        },
        button_dark: {
          DEFAULT: "#fa754e",
        },
      },
    },
  },
  plugins: [],
};
