/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F2F8F3',
          100: '#E1EFE3',
          500: '#2E7D32', // Primary Brand Deep Green
          600: '#256728',
          700: '#1C4F1F',
          800: '#143A16',
          900: '#0A200B',
        },
        warmbg: '#F5F5F0',
        golden: '#F4A62D',
        alertred: '#D32F2F',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}
