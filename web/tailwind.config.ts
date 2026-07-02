import type { Config } from "tailwindcss";

// Cifra — "Confidential Noir + Emerald"
// Warm near-black editorial base, bone/cream type, gold accent for revealed/paid state.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b0a09", // page ground (warm near-black)
        "ink-2": "#14120f", // panel
        "ink-3": "#1c1916", // raised
        rule: "#2a2520", // hairline
        "rule-2": "#3a342d",
        paper: "#f5efe2", // primary type (bone/cream)
        "paper-dim": "#c9c1b1",
        "paper-faint": "#7d756a", // ghosted ciphertext
        "paper-ghost": "#4a443c",
        gold: {
          DEFAULT: "#E5B045", // reveal / paid
          deep: "#C08A2E",
          soft: "#F3D9A0",
        },
        primary: "#E5B045", // alias used by anime-navbar
        crimson: "#b8553a",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        sweep: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(120%)" },
        },
        "reveal-pop": {
          "0%": { opacity: "0", transform: "translateY(2px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-slow": {
          "0%, 100%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        sweep: "sweep 2.4s ease-in-out infinite",
        "reveal-pop": "reveal-pop 0.35s ease-out",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
