/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#F7FAFC',  // Background: Soft White
          100: '#E2E8F0', 
          500: '#4A697C', 
          600: '#243746', // Text: Slate Blue
          700: '#0A5C7A', // Secondary: Ocean Blue
          800: '#063B5C', // Primary: Deep Ocean Blue
          900: '#062B3D', // Dark: Midnight Ocean
        },
        turquoise: {
          400: '#E3C45F',
          500: '#D4AF37', // Accent: Champagne Gold
          600: '#B8962A', // Dark Accent
        },
        sand: {
          50: '#F7FAFC',  // Background: Soft White
          100: '#EDF2F7', 
          200: '#E2E8F0',
          300: '#CBD5E0',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
