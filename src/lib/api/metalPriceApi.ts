// src/lib/api/metalPriceApi.ts

import priceHistory from '../../../social/data/price-history.json';

const API_KEY = import.meta.env.METALPRICE_API_KEY;
const TROY_OUNCE_IN_GRAMS = 31.1034768;

// 'YYYY-MM-DD' → UTC-keskipäivä. Helsinki on aina UTC:n edellä, joten
// keskipäivä UTC:ssä pysyy samalla kalenteripäivällä Suomen ajassa
// riippumatta build-palvelimen omasta aikavyöhykkeestä.
function dateAnchor(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00Z`);
}
const CACHE_DURATION_MS = 45 * 60 * 1000; // 45 min cache (säästää API-quotaa)

interface CachedPrice {
  data: GoldPriceResult;
  timestamp: number;
}

// In-memory välimuisti
let priceCache: CachedPrice | null = null;
// Jaettu keskeneräinen haku: build renderöi useita sivuja, jotka kaikki
// kutsuvat getGoldPrice()-funktiota — tämä estää saman API-hakua käynnistymästä
// useaan kertaan rinnakkain samassa buildissa.
let pending: Promise<GoldPriceResult | null> | null = null;

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
  /** 'api' = tuore hintapalveluhaku, 'history' = päiväkohtainen fallback-havainto (ei kellonaikaa). */
  source: 'api' | 'history';
}

export async function getGoldPrice(): Promise<GoldPriceResult | null> {
  // 1. DEV-MODE: Säästetään API-kutsuja kehityksen aikana.
  // Hinta luetaan hintahistorian viimeisestä pisteestä, jotta dev vastaa tuotantoa.
  if (import.meta.env.DEV) {
    console.log("🛠️ DEV-MODE: Käytetään hintahistorian viimeisintä hintaa");
    return getFallbackPrice();
  }

  // 2. CACHE: Tarkistetaan löytyykö tuore hinta muistista
  const now = Date.now();
  if (priceCache && (now - priceCache.timestamp < CACHE_DURATION_MS)) {
    console.log(`📦 CACHE: Käytetään tallennettua hintaa (${Math.round((now - priceCache.timestamp) / 60000)} min vanha)`);
    return { ...priceCache.data, fromCache: true };
  }

  // 3. Rinnakkaiset kutsut jakavat saman keskeneräisen haun
  if (pending) return pending;

  pending = fetchPrice();
  try {
    return await pending;
  } finally {
    pending = null;
  }
}

// Varahinta myös cachetaan: build renderöi useita sivuja peräkkäin, ja
// ilman tätä joka sivu yrittäisi omaa API-hakuaan uudelleen katkoksen aikana
// (jokainen 10s timeoutilla) sen sijaan, että koko build käyttäisi samaa
// kertaalleen selvitettyä varahintaa.
function resolveFallback(): GoldPriceResult {
  const fallback = getFallbackPrice();
  priceCache = { data: fallback, timestamp: Date.now() };
  return fallback;
}

async function fetchPrice(): Promise<GoldPriceResult | null> {
  console.log("🌐 API: Haetaan uusi hinta...");

  if (!API_KEY) {
    console.error('❌ VIRHE: API-avain puuttuu .env tiedostosta');
    return resolveFallback();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    // EU-palvelin: matalampi latenssi Suomesta (metalpriceapi.com/documentation#api_servers)
    const response = await fetch(
      `https://api-eu.metalpriceapi.com/v1/latest?api_key=${API_KEY}&base=USD&currencies=XAU,EUR`,
      { signal: controller.signal }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: MetalPriceResponse = await response.json();

    const xau = data.rates?.XAU;
    const eur = data.rates?.EUR;
    if (!data.success || !Number.isFinite(xau) || !Number.isFinite(eur) || !xau || !eur || xau <= 0 || eur <= 0) {
      throw new Error('API vastaus puutteellinen');
    }

    // Laskenta: (1 / XAU) * EUR_kurssi / 31.103...
    const priceUsdOz = 1 / xau;
    const priceEurGram = (priceUsdOz * eur) / TROY_OUNCE_IN_GRAMS;
    if (!Number.isFinite(priceEurGram) || priceEurGram <= 0) {
      throw new Error('Laskettu hinta ei ole kelvollinen');
    }

    const result: GoldPriceResult = {
      priceEurGram: Number(priceEurGram.toFixed(4)),
      priceUsdOz: Number(priceUsdOz.toFixed(2)),
      usdEurRate: Number(eur.toFixed(4)),
      updatedAt: new Date(),
      fromCache: false,
      source: 'api',
    };

    // Päivitä cache
    priceCache = { data: result, timestamp: Date.now() };
    console.log(`✅ API OK: ${result.priceEurGram.toFixed(2)} €/g`);

    return result;

  } catch (error) {
    console.error('❌ API-virhe, käytetään varahintaa:', error);
    return resolveFallback();
  } finally {
    clearTimeout(timeoutId);
  }
}

function getFallbackPrice(): GoldPriceResult {
  // Jos cache on olemassa (vaikka vanha), käytetään sitä
  if (priceCache) {
    return { ...priceCache.data, fromCache: true };
  }

  // Viimeinen hätävara: hintahistorian tuorein KELVOLLINEN piste. Etsitään
  // lopusta taaksepäin, jottei yksittäinen rikkinäinen viimeinen rivi kaada
  // koko buildin hintanäyttöä (social/data/price-history.json on myös tämä
  // fallback, joten sen on toimittava vaikka data sisältäisi virheellisiä rivejä).
  // `point &&` -tarkistus torjuu myös null/undefined-rivit (ei vain vääränmuotoiset).
  const validLast = [...priceHistory].reverse().find(
    (point) => point && Number.isFinite(point.price) && point.price > 0 && /^\d{4}-\d{2}-\d{2}$/.test(point.date)
  );

  if (!validLast) {
    // Koko historia on virheellinen — ei palauteta hylättyä (esim. negatiivista)
    // riviä uudelleen käyttöön, vaan tunnistettavasti tyhjä hinta.
    console.error('❌ VIRHE: price-history.json ei sisällä yhtään kelvollista pistettä');
    return {
      priceEurGram: 0,
      priceUsdOz: 0,
      usdEurRate: 0,
      updatedAt: new Date(),
      fromCache: true,
      source: 'history',
    };
  }

  return {
    priceEurGram: validLast.price,
    priceUsdOz: 0,
    usdEurRate: 0,
    updatedAt: dateAnchor(validLast.date),
    fromCache: true,
    source: 'history',
  };
}
