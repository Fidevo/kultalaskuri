// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://kultalaskuri.fi',
  output: 'static',

  build: {
    // Upota CSS suoraan jokaisen sivun <head>:iin erillisen /_astro/index.<hash>.css
    // -tiedoston sijaan. Syy: sivusto deployataan tunneittain ja jokainen deploy
    // korvaa koko dist/-puun GitHub Pagesissa → edellisen buildin hashattu CSS
    // katoaa palvelimelta. Jos selaimella on vielä välimuistissa vanha HTML
    // (Pages tarjoilee HTML:n max-age=600), se osoittaa kadonneeseen CSS-hashiin
    // → 404 → sivu renderöityy täysin tyylittelemättömänä (näkyi työpöytä-Chromessa
    // linkkiä klikatessa, korjaantui välimuistin tyhjennyksellä). Upotettuna
    // CSS-pyyntöä ei ole → tyylit eivät voi kadota. Lisäkoko ~9 kt (gzip) / sivu.
    inlineStylesheets: 'always',
  },

  integrations: [
    react(), 
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      // Käyttöehdot ja tietosuojaseloste ovat noindex (ks. BaseLayout `noindex`-propi)
      // — pidetään sitemap ja robots-meta samassa linjassa.
      filter: (page) => !page.endsWith('/kayttoehdot/') && !page.endsWith('/tietosuoja/'),
    }),
  ],
});