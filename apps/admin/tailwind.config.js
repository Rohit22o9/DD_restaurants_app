/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          forest: '#264329',
          'forest-dark': '#182E1B',
          'forest-light': '#365D3B',
          orange: '#ED8533',
          'orange-hover': '#DA7424',
          'orange-light': '#FDF3EB',
          mint: '#EBF5EE',
          'mint-subtle': '#F4FAF6',
          'mint-border': '#D8E5DC',
          cream: '#FAFCF9',
          dark: '#152217',
          muted: '#5A6E5E',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft-sm': '0 2px 8px -2px rgba(22, 38, 25, 0.06)',
        'soft': '0 8px 30px -4px rgba(22, 38, 25, 0.08)',
        'soft-lg': '0 16px 40px -6px rgba(22, 38, 25, 0.12)',
      }
    },
  },
  plugins: [],
}
