/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        background: "#0B0E14",
        surface: {
          DEFAULT: "#141922",
          2: "#1B212D",
          3: "#232B39",
        },
        border: "#262E3D",
        text: {
          DEFAULT: "#EEF1F6",
          dim: "#9AA3B5",
          faint: "#626B7D",
        },
        primary: {
          DEFAULT: "#7C6FF2",
          hover: "#6257D6",
          active: "#6257D6",
        },
        accent: {
          DEFAULT: "#F2B84B",
        },
        success: {
          DEFAULT: "#45D999",
        },
        danger: {
          DEFAULT: "#F2665E",
        },
        // Standard shadcn variables mapped to tailwind config
        card: {
          DEFAULT: "#141922",
          foreground: "#EEF1F6",
        },
        popover: {
          DEFAULT: "#141922",
          foreground: "#EEF1F6",
        },
        muted: {
          DEFAULT: "#1B212D",
          foreground: "#9AA3B5",
        },
        destructive: {
          DEFAULT: "#F2665E",
          foreground: "#EEF1F6",
        },
      },
      borderRadius: {
        lg: "20px",
        md: "14px",
        sm: "10px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-space-grotesk)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
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
}
