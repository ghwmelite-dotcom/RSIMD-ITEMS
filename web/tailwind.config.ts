import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ghana: {
          green: "#006B3F",
          "green-light": "#00895A",
          gold: "#FCD116",
          "gold-dim": "#D4A800",
          red: "#CE1126",
          black: "#1a1a1a",
        },
        neon: {
          green: "#00E676",
          blue: "#00B0FF",
          amber: "#FFD600",
          red: "#FF1744",
        },
        surface: {
          50: "#F8FAFB",
          100: "#EFF2F5",
          200: "#DDE3E9",
          300: "#C4CDD6",
          400: "#8E9BAA",
          500: "#64748B",
          600: "#475569",
          700: "#1E293B",
          800: "#152031",
          850: "#111A2C",
          900: "#0D1526",
          950: "#080F1C",
        },
      },
      fontFamily: {
        display: ['"JetBrains Mono"', "monospace"],
        mono: ['"JetBrains Mono"', "Consolas", "monospace"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
      },
      boxShadow: {
        "tech-sm": "0 1px 3px rgba(0, 0, 0, 0.12), 0 0 1px rgba(0, 230, 118, 0.05)",
        "tech": "0 4px 16px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0, 230, 118, 0.08)",
        "tech-lg": "0 8px 32px rgba(0, 0, 0, 0.2), 0 0 2px rgba(0, 230, 118, 0.1)",
        "tech-xl": "0 16px 48px rgba(0, 0, 0, 0.25), 0 0 3px rgba(0, 230, 118, 0.08)",
        "neon-green": "0 0 15px rgba(0, 230, 118, 0.2), 0 0 30px rgba(0, 230, 118, 0.05)",
        "neon-blue": "0 0 15px rgba(0, 176, 255, 0.2), 0 0 30px rgba(0, 176, 255, 0.05)",
        "neon-gold": "0 0 15px rgba(252, 209, 22, 0.2), 0 0 30px rgba(252, 209, 22, 0.05)",
      },
      backgroundImage: {
        "circuit-pattern": `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%2300E676' stroke-opacity='0.06' stroke-width='0.5'%3E%3Cpath d='M0 40h20m10 0h20m10 0h20'/%3E%3Cpath d='M40 0v20m0 10v20m0 10v20'/%3E%3Ccircle cx='20' cy='20' r='2'/%3E%3Ccircle cx='60' cy='20' r='2'/%3E%3Ccircle cx='20' cy='60' r='2'/%3E%3Ccircle cx='60' cy='60' r='2'/%3E%3Ccircle cx='40' cy='40' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
        "grid-pattern": `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40' fill='none' stroke='%2300E676' stroke-opacity='0.03' stroke-width='0.5'/%3E%3C/svg%3E")`,
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        "slide-in-left": "slideInLeft 0.4s ease-out forwards",
        "scale-in": "scaleIn 0.3s ease-out forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "scan": "scan 3s ease-in-out infinite",
        "data-flow": "dataFlow 2s linear infinite",
        "blink": "blink 1.5s step-end infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        scan: {
          "0%, 100%": { transform: "translateY(-100%)", opacity: "0" },
          "50%": { transform: "translateY(100%)", opacity: "0.5" },
        },
        dataFlow: {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "40px 40px" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 5px rgba(0, 230, 118, 0.2), 0 0 10px rgba(0, 230, 118, 0.1)" },
          "50%": { boxShadow: "0 0 15px rgba(0, 230, 118, 0.4), 0 0 30px rgba(0, 230, 118, 0.15)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
