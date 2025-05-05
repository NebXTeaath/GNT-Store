// tailwind.config.js
module.exports = {
  content: [
    // Add paths to all of your template files here
    "./src/**/*.{js,ts,jsx,tsx}",
    // "./public/index.html", // etc.
  ],
  theme: {
    extend: {
      maxWidth: {
        'xxs': '16rem', // This is fine
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"), // <-- CORRECT way to include the plugin
  ],
}