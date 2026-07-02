import type { Config } from "tailwindcss";

// Cifra — "Confidential Noir + Emerald"
// Warm near-black editorial base, bone/cream type, emerald accent for revealed/paid state.
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
        emerald: {
          DEFAULT: "#10b981", // reveal / paid
          deep: "#0f9d76",
          soft: "#6ee7b7",
        },
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
      },
      animation: {
        sweep: "sweep 2.4s ease-in-out infinite",
        "reveal-pop": "reveal-pop 0.35s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
