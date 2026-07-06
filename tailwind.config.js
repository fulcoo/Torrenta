/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
  plugins: [
    require("daisyui"),
  ],
  daisyui: {
    themes: [
      "light",
      "dark",
      "cupcake",
      "emerald",
      "synthwave",
      "retro",
      {
        cyberpunk: {
          "primary": "#ff007f",      // Neon Pink
          "secondary": "#00ffc8",    // Neon Cyan
          "accent": "#ffe600",       // Neon Yellow
          "neutral": "#1b0030",      // Deep Purple Neutral
          "base-100": "#120024",     // Dark Purple Base
          "base-200": "#1a0033",     // Secondary Base
          "base-300": "#0a0018",     // Core Body Background
          "base-content": "#ffffff",  // High-contrast text
          "info": "#00e5ff",
          "success": "#00ff66",
          "warning": "#ffe600",
          "error": "#ff0055",
          "--rounded-box": "1rem",
          "--rounded-btn": "0.75rem",
          "--rounded-badge": "1.9rem",
        }
      },
      "valentine",
      "halloween",
      "forest",
      "aqua",
      "luxury",
      "dracula",
      "business",
      "night",
      "coffee",
      "winter",
      "dim",
      "nord",
      "sunset"
    ],
  },
}
