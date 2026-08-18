import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F1B16",
        paper: "#FAFAF7",
        line: "#E4E4DE",
        brand: {
          50: "#EEF7F2",
          100: "#D7EEE0",
          200: "#AEDCC1",
          300: "#7FC6A0",
          400: "#4CAE7F",
          500: "#1F8F5F",
          600: "#166B47",
          700: "#0F4F35",
          800: "#0B3B28",
          900: "#082A1D"
        },
        sand: "#F1EEE4",
        clay: "#C77B4A",
        alert: "#B3541E"
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,27,22,0.04), 0 8px 24px -12px rgba(15,27,22,0.12)"
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    }
  },
  plugins: []
};
export default config;
