import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "brand-blue": {
          50: "#e6f0ff",
          100: "#b3d1ff",
          200: "#80b3ff",
          300: "#4d94ff",
          400: "#1a75ff",
          500: "#0066FF",
          600: "#0052cc",
          700: "#003d99",
          800: "#002966",
          900: "#001433",
          950: "#000a1a",
        },
      },
      boxShadow: {
        "brand-glow": "0 0 20px -5px rgba(0, 102, 255, 0.4)",
        "brand-glow-lg": "0 0 40px -10px rgba(0, 102, 255, 0.35)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
