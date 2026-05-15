import type { Config } from "tailwindcss";

const config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        navy: "var(--navy)",
        blue: "var(--blue)",
        cyan: "var(--cyan)",
        aqua: "var(--aqua)",
        green: "var(--green)",
        amber: "var(--amber)",
        red: "var(--red)",
        muted: "var(--muted)",
        line: "var(--line)",
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
