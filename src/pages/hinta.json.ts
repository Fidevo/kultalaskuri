// Staattinen JSON-endpoint: /hinta.json
// Käytetään upotettavassa hintawidgetissä (public/widget.js) ja avoimena datana.
// Generoituu buildissa — päivittyy samalla kun muu sivusto (päivittäin klo 18).
import type { APIRoute } from 'astro';
import { getGoldPrice } from '../lib/api/metalPriceApi';
import { calculateGoldValue } from '../lib/calculations/goldCalculator';

export const GET: APIRoute = async () => {
  const goldPrice = await getGoldPrice();
  const spot = goldPrice?.priceEurGram ?? 0;

  const target = (purity: '14K' | '18K' | '24K') =>
    spot > 0 ? calculateGoldValue(1, purity, spot)?.targetValue ?? null : null;

  const body = {
    // Puhtaan kullan (24K) spot-hinta €/g
    spotEurPerGram: spot > 0 ? Number(spot.toFixed(2)) : null,
    // Reilut tavoitehinnat (arvioitu ostohintataso) €/g
    target14k: target('14K'),
    target18k: target('18K'),
    target24k: target('24K'),
    updatedAt: goldPrice?.updatedAt ?? null,
    currency: 'EUR',
    unit: 'gram',
    source: 'Kultalaskuri.fi',
    sourceUrl: 'https://kultalaskuri.fi',
    license: 'Vapaasti käytettävissä lähdelinkillä (kultalaskuri.fi)',
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
