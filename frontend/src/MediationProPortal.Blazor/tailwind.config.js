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
      // Extend Tailwind theme to match ABP/Lepton theme colors if needed
      colors: {
        // Add custom colors here if needed
      },
    },
  },
  plugins: [],
  // Important: Use 'important' selector to override Bootstrap/Blazorise styles when needed
  // important: true, // Uncomment if you need to override Bootstrap styles
  corePlugins: {
    // Disable preflight to avoid conflicts with Bootstrap
    preflight: false, // Set to true if you want Tailwind's base styles
  },
}
