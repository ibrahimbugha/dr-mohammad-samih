/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Landmark category colours — keep in sync with LandmarkEditor.jsx
        skeletal:    { DEFAULT: '#3B82F6', light: '#BFDBFE' },  // blue
        dental:      { DEFAULT: '#EAB308', light: '#FEF9C3' },  // yellow
        softTissue:  { DEFAULT: '#22C55E', light: '#DCFCE7' },  // green
        // App accent
        clinical:    { 50: '#f0f9ff', 500: '#0ea5e9', 700: '#0369a1' },
      },
    },
  },
  plugins: [],
}
