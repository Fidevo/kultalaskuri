/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';

// Redesign 9/2026 ("private banking"): logon värit (#0B0F19 + #D4AF37) pohjana, kulta
// vain aksenttina, lämmin paperinsävy neutraaleissa. Teeman skaalat on
// uudelleenmääritelty (gray, borderRadius, boxShadow, fontWeight), jotta koko
// sivuston olemassa olevat luokat saavat uuden ilmeen ilman sivukohtaisia muutoksia.
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        serif: ['"Source Serif 4"', 'Georgia', ...defaultTheme.fontFamily.serif],
      },
      // Inter ladataan painoilla 400–700: raskaat painot mapataan 700:aan, jotta
      // font-black/extrabold ei tuota keinotekoista lihavointia (font-synthesis: none).
      fontWeight: {
        extrabold: '700',
        black: '700',
      },
      colors: {
        // Neutraali harmaa → lämmin "paperi"-skaala. Kaikki bg-gray-50 -osiot ja
        // tekstisävyt lämpenevät automaattisesti. Kontrastit: gray-500 valkoisella
        // 5,4:1, gray-50:llä 5,0:1 (AA).
        gray: {
          50:  '#F7F6F3',
          100: '#EFEEEA',
          200: '#E3E1DB',
          300: '#CDCAC2',
          400: '#A29E94',
          500: '#6E6A62',
          600: '#56534C',
          700: '#403E39',
          800: '#2A2926',
          900: '#191917',
          950: '#0F0F0E',
        },
        // Musteensininen logon taustaväristä (#0B0F19) johdettu skaala — hero,
        // header, footer, laskurin näyttöpaneeli ja valitut näppäimet.
        ink: {
          50:  '#F3F4F7',
          100: '#E6E9EF',
          200: '#CDD2DE',
          300: '#A9B1C3',
          400: '#7D88A1',
          500: '#56637F',
          600: '#3A4766',
          700: '#28344F',
          800: '#1C263D',
          900: '#131B2E',
          950: '#0B0F19',
        },
        // Logon kulta (#D4AF37) — käytetään aksenttina, ei pintaväreinä.
        // gold-600 valkoisella 5,1:1 / gray-50:llä 4,7:1 (AA tekstille).
        gold: {
          50:  '#FDFBF3',
          100: '#FBF8EB',
          200: '#F5ECCD',
          300: '#ECD895',
          400: '#D4AF37', // Logon kulta
          500: '#B59428',
          600: '#856B19',
          700: '#6B5615',
          glow: '#F9E29C',
        },
        dark: {
          bg: '#0B0F19',
          card: '#131b2e',
        }
      },
      // Asiallisemmat kulmat: sama luokkanimistö, pienemmät säteet.
      borderRadius: {
        DEFAULT: '0.25rem',
        md: '0.3125rem',
        lg: '0.375rem',
        xl: '0.5rem',
        '2xl': '0.625rem',
        '3xl': '0.75rem',
      },
      // Varjot hillitympiä — rahoitusalan ilme nojaa hiusviivoihin, ei leijuviin kortteihin.
      boxShadow: {
        sm: '0 1px 2px 0 rgb(11 15 25 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(11 15 25 / 0.07), 0 1px 2px -1px rgb(11 15 25 / 0.05)',
        md: '0 4px 12px -4px rgb(11 15 25 / 0.10)',
        lg: '0 12px 28px -12px rgb(11 15 25 / 0.18)',
        xl: '0 20px 40px -18px rgb(11 15 25 / 0.22)',
        '2xl': '0 28px 60px -24px rgb(11 15 25 / 0.35)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #F5ECCD 0%, #D4AF37 50%, #B59428 100%)',
        'dark-glow': 'radial-gradient(circle at center, rgba(212, 175, 55, 0.12) 0%, rgba(11, 15, 25, 0) 70%)',
      },
    },
  },
  plugins: [],
}
