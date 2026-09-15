import type { Config } from "tailwindcss";

/**
 * Design tokens mirror chanhdai.com: a zinc-based neutral scale driven by CSS
 * custom properties so the same markup renders in light and dark. Colours are
 * referenced through `var(--token)` (not `<alpha-value>`), so Tailwind opacity
 * modifiers such as `text-foreground/70` are intentionally avoided in markup —
 * use the dedicated `*-dim` tokens or the `opacity-*` utilities instead.
 */
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        border: "var(--border)",
        line: "var(--line)",
        success: "var(--success)",
        info: "var(--info)",
      },
      fontFamily: {
        sans: ["var(--font-sans-stack)"],
        mono: ["var(--font-mono-stack)"],
      },
      letterSpacing: {
        label: "0.18em",
      },
    },
  },
  plugins: [],
};

export default config;
