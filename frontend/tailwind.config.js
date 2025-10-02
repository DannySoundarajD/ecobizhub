// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Make sure this path correctly covers your Navbar.jsx
    // If your `navbarppages` components also use Tailwind, include that path too:
    "./src/components/navbarppages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-purple': '#4f3267', // Your original navbar background color
        'light-bg': '#f8f9fa',       // Bootstrap's .bg-light default
        'input-border': '#ffe1d7',   // From .custom-input-group border
        'input-bg': '#fff7f3',       // From .custom-input-group background
        'input-text': '#4b2169',     // From .custom-input color/placeholder
        'accent-purple': '#C959EA',  // From search input-group-text background
        'accent-orange': '#ff7a45',  // From .change-btn color
      },
      boxShadow: {
        'custom-sm': '0 2px 5px rgba(0,0,0,0.2)', // From previous header examples
        'dropdown': '0 0.5rem 1rem rgba(0,0,0,0.175)', // Bootstrap default shadow
        'dropdown-dark': '0 5px 15px rgba(0,0,0,0.3)', // Custom dark dropdown shadow
      },
      fontSize: {
        'base-icon': '1.2rem', // For icon-style
        'link-lg': '1.25rem', // For fs-5 links
      },
      transitionProperty: {
        'transform': 'transform',
      },
      transitionDuration: {
        '400': '400ms', // For card-image
      },
    },
  },
  plugins: [],
}