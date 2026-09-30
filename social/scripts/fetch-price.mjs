// social/scripts/fetch-price.mjs
// Hakee kullan hinnan MetalPrice API:sta (sama logiikka kuin sivustolla)

const TROY_OUNCE_IN_GRAMS = 31.1034768;

export async function fetchGoldPrice() {
  const apiKey = process.env.METALPRICE_API_KEY;
  if (!apiKey) throw new Error('METALPRICE_API_KEY puuttuu');

  // EU-palvelin: matalampi latenssi (metalpriceapi.com/documentation#api_servers)
  // Hopea (XAG) samassa kutsussa — yksi kutsu kuluttaa yhden pyynnön kiintiöstä
  // metallien määrästä riippumatta (testattu 28.9.2026).
  const res = await fetch(
    `https://api-eu.metalpriceapi.com/v1/latest?api_key=${apiKey}&base=USD&currencies=XAU,XAG,EUR`
  );

  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  const data = await res.json();

  if (!data.success || !data.rates?.XAU || !data.rates?.EUR) {
    throw new Error('API vastaus puutteellinen');
  }

  const priceUsdOz = 1 / data.rates.XAU;
  const priceEurGram = (priceUsdOz * data.rates.EUR) / TROY_OUNCE_IN_GRAMS;

  // Hopea valinnainen: puuttuva XAG ei kaada kullan tallennusta.
  // Neljä desimaalia, koska hopean grammahinta on alle parin euron.
  const silverEurGram = data.rates.XAG > 0
    ? Number((((1 / data.rates.XAG) * data.rates.EUR) / TROY_OUNCE_IN_GRAMS).toFixed(4))
    : null;

  return {
    priceEurGram: Number(priceEurGram.toFixed(2)),
    priceUsdOz: Number(priceUsdOz.toFixed(2)),
    silverEurGram,
    timestamp: new Date().toISOString(),
  };
}

// 14K ja 18K hinnat
export function calcPurityPrice(spotEurGram, purityDecimal, targetPercent = 0.81) {
  return Number((spotEurGram * purityDecimal * targetPercent).toFixed(2));
}
