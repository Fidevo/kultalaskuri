// social/scripts/price-guard.mjs — API-hinnan uskottavuustarkistus
//
// Jaettu buildin (src/lib/api/metalPriceApi.ts) ja päivittäisen tallennuksen
// (save-price.mjs) kesken. API:n kelvolliselta näyttävä mutta väärä luku
// (desimaalivirhe, väärä valuuttakurssi, XAU/XAG sekaisin) näkyisi muuten
// laskurissa ja tallentuisi pysyvästi hintahistoriaan, joka on myös buildin
// varahinta.
//
// Rajat kalibroitu 2011→ datasta (7.10.2026): suurin päivämuutos kullalla
// -8,1 % (15.4.2013), hopealla -29,3 % (2.2.2026, viikonlopun yli). Raja on
// selvästi niiden yläpuolella, jotta aito pörssiliike ei koskaan jää kiinni.

export const MAX_CHANGE_PCT = { gold: 12, silver: 35 };

// Jos vertailupiste on tätä vanhempi, historia on itse jäänyt jälkeen
// (healthchecks hälyttää siitä erikseen) eikä kiinteä raja ole enää mielekäs.
const MAX_REFERENCE_AGE_DAYS = 21;

/** Hintahistorian tuorein kelvollinen piste (sama ehto kuin buildin fallbackissa). */
export function lastValidPoint(history) {
  return [...history].reverse().find(
    (p) => p && Number.isFinite(p.price) && p.price > 0 && /^\d{4}-\d{2}-\d{2}$/.test(p.date)
  ) ?? null;
}

/**
 * Vertaa uutta hintaa historian tuoreimpaan kelvolliseen pisteeseen.
 * @param {number} price uusi €/g-hinta
 * @param {Array<{date: string, price: number}>} history
 * @param {'gold' | 'silver'} metal
 * @returns {{ ok: boolean, reason?: string }}
 */
export function checkPlausible(price, history, metal) {
  const ref = lastValidPoint(history);
  if (!ref) return { ok: true };

  const ageDays = (Date.now() - Date.parse(`${ref.date}T12:00:00Z`)) / 86_400_000;
  if (ageDays > MAX_REFERENCE_AGE_DAYS) return { ok: true };

  const changePct = (price / ref.price - 1) * 100;
  const limit = MAX_CHANGE_PCT[metal];
  if (Math.abs(changePct) <= limit) return { ok: true };

  return {
    ok: false,
    reason: `${metal === 'gold' ? 'Kulta' : 'Hopea'} ${Number(price.toFixed(4))} €/g poikkeaa ${changePct.toFixed(1)} % `
      + `historian pisteestä ${ref.date} (${ref.price} €/g), raja ±${limit} %`,
  };
}
