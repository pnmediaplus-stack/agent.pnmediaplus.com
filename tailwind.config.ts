import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 0 1px rgb(255 255 255 / 0.08), 0 16px 40px rgb(15 23 42 / 0.24)"
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};

export default config;
