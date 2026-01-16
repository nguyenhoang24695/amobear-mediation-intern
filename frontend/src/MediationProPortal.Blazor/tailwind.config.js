/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./Components/**/*.{razor,cshtml,html,cs}",
    "./Pages/**/*.{razor,cshtml,html,cs}",
    "./wwwroot/**/*.html",
    "../MediationProPortal.Application/**/*.cs",
    "../MediationProPortal.Application.Contracts/**/*.cs"
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#3c4cb4",
        "primary-dark": "#2c388c",
        "background-light": "#f6f6f8",
        "background-dark": "#14151e",
        "success": "#22c55e",
        "warning": "#eab308",
        "danger": "#ef4444",
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"],
        "body": ["Inter", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "sm": "0.125rem",
        "md": "0.375rem",
        "lg": "0.5rem",
        "full": "9999px"
      },
      fontSize: {
        "xxs": "0.65rem",
      },
      boxShadow: {
        "card": "0 2px 8px rgba(0,0,0,0.02)"
      }
    },
  },
  plugins: [],
  // Enable important to override Bootstrap styles
  important: true, // Force Tailwind to override Bootstrap
  corePlugins: {
    // Enable preflight to reset Bootstrap styles
    preflight: true, // Tailwind's base styles will reset Bootstrap
  },
}
