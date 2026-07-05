/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        gold: {
          50:  '#FDFBF3',
          100: '#FBF8EB',
          200: '#F5ECCD',
          300: '#ECD895',
          400: '#D4AF37', // Classic Gold
          500: '#B59428',
          600: '#8E731C',
          700: '#6B5615',
          glow: '#F9E29C', // Hehkuva vaalea
        },
        dark: {
          bg: '#0B0F19',
          card: '#131b2e',
        }
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #F5ECCD 0%, #D4AF37 50%, #B59428 100%)',
        'dark-glow': 'radial-gradient(circle at center, rgba(212, 175, 55, 0.15) 0%, rgba(11, 15, 25, 0) 70%)',
      },
    },
  },
  plugins: [],
}