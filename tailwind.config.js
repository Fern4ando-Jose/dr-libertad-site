/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0b0c",
        offwhite: "#f4f0e8",
        "warm-gray": "#b9b0a2",
        beige: "#e7ddcc",
        "muted-red": "#a45a5a"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(0,0,0,0.55)"
      }
    }
  },
  plugins: []
};

