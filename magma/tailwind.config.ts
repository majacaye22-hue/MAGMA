import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0c0c0b",
        surface: "#141412",
        accent: "#D85A30",
        "text-primary": "#e8e4dc",
        "text-muted": "#888780",
        border: "#2a2a28",
      },
      fontFamily: {
        mono: ['"Space Mono"', "monospace"],
        display: ["Syne", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
