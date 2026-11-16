import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // 10-step PassQ Brand Red Palette
        brand: {
          50: "#fdecec",
          100: "#fbd5d5",
          200: "#f6b0b0",
          300: "#f08383",
          400: "#e75353",
          500: "#e23b3b",
          600: "#dc2626", // Signature PassQ Red
          700: "#a81919",
          800: "#8c1517",
          900: "#7a1315",
          DEFAULT: "#dc2626",
        },
        // 10-step PassQ Ink Neutral Palette
        ink: {
          50: "#f5f4f7",
          100: "#eceaf0",
          200: "#e2dee3",
          300: "#cfc9d1",
          400: "#948b94",
          500: "#786c75",
          600: "#6e5c61",
          700: "#4a373c",
          800: "#3a262b",
          900: "#2b1a1e", // Body foreground text
          DEFAULT: "#2b1a1e",
        },
        // PassQ semantic brand colors & legacy aliases
        passq: {
          red: "#dc2626",
          ink: "#2b1a1e",
          purpleGray: "#eceaf0",
          cardMuted: "#f5f4f7",
          border: "#e2dee3",
          green: "#12a150",
          blue: "#1f6fb2",
          amber: "#a36a0a",
          purple: "#7c3aed",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "var(--font-be-vietnam-pro)",
          "Be Vietnam Pro",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "SF Mono",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
