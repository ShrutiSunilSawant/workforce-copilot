/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gray: {
          900: "#0f1117",
          800: "#131720",
          700: "#1a1f2e",
          600: "#1f2937",
          500: "#2d3748",
          400: "#4a5568",
          300: "#64748b",
          200: "#94a3b8",
          100: "#cbd5e1",
          50: "#e2e8f0",
        }
      },
      fontFamily: {
        sans: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
