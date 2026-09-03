import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0e0c0a",
          900: "#161310",
          850: "#1c1915",
          800: "#241f1a",
          700: "#3a332b",
          600: "#5c5348",
        },
        paper: "#f3ead8",
        ink: "#1a1510",
        copper: {
          DEFAULT: "#d08a3a",
          dim: "#b5752e",
        },
        accent: {
          DEFAULT: "#d08a3a",
          dim: "#b5752e",
        },
      },
      fontFamily: {
        serif: ["Fraunces", "Iowan Old Style", "Palatino", "Georgia", "serif"],
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
      animation: {
        pulseDot: "pulseDot 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
