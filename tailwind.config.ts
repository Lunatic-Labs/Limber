import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Calm medical blue. Change here to retheme the whole app.
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#2f7fd6",
          600: "#1d6bbf",
          700: "#175a9f",
          800: "#154a82",
          900: "#12395f",
        },
        surface: "#f4f7fb",
        ink: {
          DEFAULT: "#1e293b",
          muted: "#526072",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
