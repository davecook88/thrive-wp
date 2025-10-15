/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./templates/**/*.php",
    "./includes/**/*.php",
  ],
  theme: {
    extend: {
      colors: {
        "wp-admin": {
          primary: "#007cba",
          secondary: "#005a87",
          accent: "#00a0d2",
          background: "#f1f1f1",
          border: "#c3c4c7",
          text: "#1d2327",
          "text-secondary": "#646970",
        },
      },
    },
  },
  plugins: [],
};
