// src/pages/sitemap.xml.ts
import type { APIRoute } from 'astro';

const SITE_URL = 'https://kultalaskuri.fi';

const pages = [
  { 
    url: '/', 
    changefreq: 'hourly',  
    priority: 1.0 
  },
  { 
    url: '/kullan-myynti',  
    changefreq: 'weekly', 
    priority: 0.9 
  },
  { 
    url: '/kullan-leimat',  
    changefreq: 'monthly', 
    priority: 0.8 
  },
  { 
    url: '/kayttoehdot', 
    changefreq: 'yearly', 
    priority: 0.2 
  },
  { 
    url: '/tietosuoja', 
    changefreq: 'yearly', 
    priority: 0.2 
  },
];

export const GET: APIRoute = async () => {
  // Käytä tämän päivän päivämäärää
  const today = new Date().toISOString().split('T')[0];
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600', // 1 tunti
    },
  });
};