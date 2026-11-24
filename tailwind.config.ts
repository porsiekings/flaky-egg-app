import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#ecf8f2", 100: "#d2efe1", 500: "#2f9e6e", 600: "#25825a", 700: "#1d6847" },
        amber: { 50: "#fdf5e7", 100: "#fbe8c6", 500: "#e39b2d", 600: "#c47f17" },
        ink: { DEFAULT: "#1f1d1a", muted: "#6b665d", line: "#e7e1d6" },
        paper: { DEFAULT: "#f6f3ec", card: "#fffdf8" },
      },
      fontFamily: { serif: ["Georgia", "Times New Roman", "serif"] },
      boxShadow: { card: "0 1px 0 rgba(31,29,26,.04), 0 16px 36px -22px rgba(31,29,26,.35)" },
    },
  },
  plugins: [],
};
export default config;
