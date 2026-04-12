// social/scripts/fetch-price.mjs
// Hakee kullan hinnan MetalPrice API:sta (sama logiikka kuin sivustolla)

const TROY_OUNCE_IN_GRAMS = 31.1034768;

export async function fetchGoldPrice() {
  const apiKey = process.env.METALPRICE_API_KEY;
  if (!apiKey) throw new Error('METALPRICE_API_KEY puuttuu');

  const res = await fetch(
    `https://api.metalpriceapi.com/v1/latest?api_key=${apiKey}&base=USD&currencies=XAU,EUR`
  );

  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  const data = await res.json();

  if (!data.success || !data.rates?.XAU || !data.rates?.EUR) {
    throw new Error('API vastaus puutteellinen');
  }

  const priceUsdOz = 1 / data.rates.XAU;
  const priceEurGram = (priceUsdOz * data.rates.EUR) / TROY_OUNCE_IN_GRAMS;

  return {
    priceEurGram: Number(priceEurGram.toFixed(2)),
    priceUsdOz: Number(priceUsdOz.toFixed(2)),
    timestamp: new Date().toISOString(),
  };
}

// 14K ja 18K hinnat
export function calcPurityPrice(spotEurGram, purityDecimal, targetPercent = 0.81) {
  return Number((spotEurGram * purityDecimal * targetPercent).toFixed(2));
}
