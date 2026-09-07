// Staattinen JSON-endpoint: /hinta.json
// Käytetään upotettavassa kurssiwidgetissä (public/widget.js) ja avoimena datana.
// Generoituu buildissa — päivittyy samalla kun muu sivusto (arkisin tunneittain).
//
// Rajapinta sisältää VAIN objektiivista markkinadataa: spot-kurssin ja siitä
// pitoisuudella kerrotut pörssiarvot. Tavoitehintaa (targetPercent-kerroin) EI
// julkaista — spot ja tavoitehinta rinnakkain tekisivät kertoimen johdettavaksi
// (CLAUDE.md sääntö 4). Vanhat target*-kentät säilyvät null-arvoisina, jotta
// aiemmat upotukset eivät kaadu.
import type { APIRoute } from 'astro';
import { getGoldPrice } from '../lib/api/metalPriceApi';
import { calculateGoldValue, GOLD_PURITIES, type PurityCode } from '../lib/calculations/goldCalculator';
import priceHistory from '../../social/data/price-history.json';

const TROY_OUNCE_G = 31.1035;
const HELSINKI_TZ = 'Europe/Helsinki';

export const GET: APIRoute = async () => {
  const goldPrice = await getGoldPrice();
  const spot = goldPrice?.priceEurGram ?? 0;
  const r2 = (n: number) => Number(n.toFixed(2));

  // Pörssiarvo €/g karaateittain = pitoisuus × spot (calculateGoldValue on ainoa laskentapolku)
  const perKarat: Record<string, number | null> = {};
  for (const code of Object.keys(GOLD_PURITIES) as PurityCode[]) {
    perKarat[code] = spot > 0 ? (calculateGoldValue(1, code, spot)?.spotValue ?? null) : null;
  }

  // Muutos edellisestä pörssipäivästä — sama logiikka kuin etusivun herossa:
  // verrataan viimeisimpään historiapisteeseen, joka EI ole tältä päivältä.
  const buildDay = new Date().toLocaleDateString('sv-SE', { timeZone: HELSINKI_TZ });
  const lastHist = priceHistory[priceHistory.length - 1];
  const prevHist = priceHistory[priceHistory.length - 2];
  const refHist = lastHist?.date === buildDay ? prevHist : lastHist;
  const changePct = spot > 0 && refHist && refHist.price > 0
    ? r2(((spot - refHist.price) / refHist.price) * 100)
    : null;

  const body = {
    // Puhtaan kullan (24K) spot-kurssi €/g
    spotEurPerGram: spot > 0 ? r2(spot) : null,
    // Sama kurssi troy-unssia (31,1035 g) ja kiloa kohden, €
    spotEurPerOunce: spot > 0 ? r2(spot * TROY_OUNCE_G) : null,
    spotEurPerKilo: spot > 0 ? r2(spot * 1000) : null,
    // Muutos edellisestä pörssipäivästä, %
    changePct,
    changeFromDate: refHist?.date ?? null,
    // Pörssiarvo €/g pitoisuuksittain (pitoisuus × spot)
    perKarat,
    updatedAt: goldPrice?.updatedAt ?? null,
    currency: 'EUR',
    unit: 'gram',
    source: 'Kultalaskuri.fi',
    sourceUrl: 'https://kultalaskuri.fi/kullan-hinta/',
    license: 'Vapaasti käytettävissä lähdelinkillä (kultalaskuri.fi)',
    // Poistettu rajapinnasta — pidetään avaimet yhteensopivuuden vuoksi
    target14k: null,
    target18k: null,
    target24k: null,
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
