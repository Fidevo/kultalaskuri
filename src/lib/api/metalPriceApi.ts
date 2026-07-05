// src/lib/api/metalPriceApi.ts

import priceHistory from '../../../social/data/price-history.json';

const API_KEY = import.meta.env.METALPRICE_API_KEY;
const TROY_OUNCE_IN_GRAMS = 31.1034768;

// 'YYYY-MM-DD' → paikallinen keskiyö (ei UTC), jotta kellonaikaa ei näytetä
// silloin kun tarkkaa hakuaikaa ei tiedetä (fallback-data)
function localMidnight(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}
const CACHE_DURATION_MS = 45 * 60 * 1000; // 45 min cache (säästää API-quotaa)

interface CachedPrice {
  data: GoldPriceResult;
  timestamp: number;
}

// In-memory välimuisti
let priceCache: CachedPrice | null = null;

interface MetalPriceResponse {
  success: boolean;
  rates: { XAU?: number; EUR?: number };
}

export interface GoldPriceResult {
  priceEurGram: number;
  priceUsdOz: number;
  usdEurRate: number;
  updatedAt: Date;
  fromCache: boolean;
}

export async function getGoldPrice(): Promise<GoldPriceResult | null> {
  // 1. DEV-MODE: Säästetään API-kutsuja kehityksen aikana.
  // Hinta luetaan hintahistorian viimeisestä pisteestä, jotta dev vastaa tuotantoa.
  if (import.meta.env.DEV) {
    console.log("🛠️ DEV-MODE: Käytetään hintahistorian viimeisintä hintaa");
    const last = priceHistory[priceHistory.length - 1];
    return {
      priceEurGram: last.price,
      priceUsdOz: 0,
      usdEurRate: 0,
      updatedAt: localMidnight(last.date),
      fromCache: true
    };
  }

  // 2. CACHE: Tarkistetaan löytyykö tuore hinta muistista
  const now = Date.now();
  if (priceCache && (now - priceCache.timestamp < CACHE_DURATION_MS)) {
    console.log(`📦 CACHE: Käytetään tallennettua hintaa (${Math.round((now - priceCache.timestamp)/60000)} min vanha)`);
    return { ...priceCache.data, fromCache: true };
  }

  // 3. API: Haetaan uusi hinta
  console.log("🌐 API: Haetaan uusi hinta...");
  
  if (!API_KEY) {
    console.error('❌ VIRHE: API-avain puuttuu .env tiedostosta');
    return getFallbackPrice();
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    // EU-palvelin: matalampi latenssi Suomesta (metalpriceapi.com/documentation#api_servers)
    const response = await fetch(
      `https://api-eu.metalpriceapi.com/v1/latest?api_key=${API_KEY}&base=USD&currencies=XAU,EUR`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: MetalPriceResponse = await response.json();

    if (!data.success || !data.rates.XAU || !data.rates.EUR) {
      throw new Error('API vastaus puutteellinen');
    }

    // Laskenta: (1 / XAU) * EUR_kurssi / 31.103...
    const priceUsdOz = 1 / data.rates.XAU;
    const priceEurGram = (priceUsdOz * data.rates.EUR) / TROY_OUNCE_IN_GRAMS;

    const result: GoldPriceResult = {
      priceEurGram: Number(priceEurGram.toFixed(4)),
      priceUsdOz: Number(priceUsdOz.toFixed(2)),
      usdEurRate: Number(data.rates.EUR.toFixed(4)),
      updatedAt: new Date(),
      fromCache: false
    };

    // Päivitä cache
    priceCache = { data: result, timestamp: now };
    console.log(`✅ API OK: ${result.priceEurGram.toFixed(2)} €/g`);
    
    return result;

  } catch (error) {
    console.error('❌ API-virhe, käytetään varahintaa:', error);
    return getFallbackPrice();
  }
}

function getFallbackPrice(): GoldPriceResult {
  // Jos cache on olemassa (vaikka vanha), käytetään sitä
  if (priceCache) {
    return { ...priceCache.data, fromCache: true };
  }

  // Viimeinen hätävara: hintahistorian tuorein piste (ei kovakoodattua vanhentuvaa hintaa)
  const last = priceHistory[priceHistory.length - 1];
  return {
    priceEurGram: last.price,
    priceUsdOz: 0,
    usdEurRate: 0,
    updatedAt: localMidnight(last.date),
    fromCache: true
  };
}