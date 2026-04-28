import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shell: {
          950: "#0D0D0F",
          900: "#141418",
          800: "#1B1B20",
          700: "#25252B",
          600: "#3A3A3F"
        },
        accent: {
          DEFAULT: "#6366F1",
          soft: "#8B8EF6",
          muted: "#4447D9"
        },
        warm: {
          DEFAULT: "#F5F3EE",
          muted: "#C5C2BA"
        },
        success: "#34D399",
        danger: "#F87171",
        warning: "#FBBF24"
      },
      fontFamily: {
        heading: ["var(--font-heading)"],
        mono: ["var(--font-mono)"],
        body: ["var(--font-body)"]
      },
      boxShadow: {
        glow: "0 20px 60px rgba(99, 102, 241, 0.25)"
      },
      backgroundImage: {
        "shell-gradient":
          "radial-gradient(circle at top left, rgba(99,102,241,0.25), transparent 40%), radial-gradient(circle at bottom right, rgba(255,255,255,0.08), transparent 25%)"
      }
    }
  },
  plugins: []
};

export default config;

