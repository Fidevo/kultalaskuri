#!/usr/bin/env node
// social/scripts/backfill-price-history.mjs
//
// Täydentää price-history.json-tiedostoa taaksepäin MetalPrice API:n
// timeframe-endpointilla. YKSI API-kutsu kattaa enintään 365 päivää.
//
// Käyttö:
//   METALPRICE_API_KEY=xxx node social/scripts/backfill-price-history.mjs 2025-07-01 2026-04-11
//
// Ilman argumentteja: hakee 365 päivää taaksepäin nykyisen historian
// vanhimmasta päivästä.
//
// Huom:
//  - timeframe-endpoint ei välttämättä kuulu ilmaiseen tilaukseen —
//    jos API palauttaa virheen "not allowed", tarkista tilaustasosi.
//  - Skripti EI ylikirjoita olemassa olevia päiviä, vain lisää puuttuvat.
//  - Alkuperäisestä tiedostosta otetaan varmuuskopio (.backup.json).

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HISTORY_PATH = join(__dirname, '..', 'data', 'price-history.json');
const TROY_OUNCE_IN_GRAMS = 31.1034768;
const MAX_DAYS_PER_CALL = 365;

function isoDaysAgo(fromIso, days) {
  const d = new Date(fromIso);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const apiKey = process.env.METALPRICE_API_KEY;
  if (!apiKey) throw new Error('METALPRICE_API_KEY puuttuu (aseta ympäristömuuttujana tai .env-tiedostoon)');

  const history = existsSync(HISTORY_PATH)
    ? JSON.parse(readFileSync(HISTORY_PATH, 'utf-8'))
    : [];
  const existingDates = new Set(history.map(d => d.date));
  const oldestExisting = history.length > 0 ? history[0].date : new Date().toISOString().slice(0, 10);

  // Aikaväli: argumentit tai oletuksena 365 pv taaksepäin vanhimmasta pisteestä
  const endDate = process.argv[3] ?? isoDaysAgo(oldestExisting, 1);
  const startDate = process.argv[2] ?? isoDaysAgo(endDate, MAX_DAYS_PER_CALL - 1);

  const rangeDays = Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
  if (rangeDays > MAX_DAYS_PER_CALL) {
    throw new Error(`Aikaväli on ${rangeDays} päivää — timeframe-endpoint sallii enintään ${MAX_DAYS_PER_CALL} päivää per kutsu. Aja skripti useammassa erässä.`);
  }

  console.log(`🌐 Haetaan hinnat ${startDate} – ${endDate} (${rangeDays} pv, 1 API-kutsu)...`);

  const res = await fetch(
    `https://api-eu.metalpriceapi.com/v1/timeframe?api_key=${apiKey}&start_date=${startDate}&end_date=${endDate}&base=USD&currencies=XAU,EUR`
  );
  if (!res.ok) throw new Error(`API HTTP ${res.status} — timeframe-endpoint ei ehkä kuulu tilaustasoosi`);
  const data = await res.json();
  if (!data.success || !data.rates) {
    throw new Error(`API-vastaus puutteellinen: ${JSON.stringify(data).slice(0, 200)}`);
  }

  // data.rates = { "YYYY-MM-DD": { XAU: ..., EUR: ... }, ... }
  const newEntries = [];
  for (const [date, rates] of Object.entries(data.rates)) {
    if (existingDates.has(date)) continue;
    if (!rates?.XAU || !rates?.EUR) continue;
    const priceUsdOz = 1 / rates.XAU;
    const priceEurGram = (priceUsdOz * rates.EUR) / TROY_OUNCE_IN_GRAMS;
    newEntries.push({ date, price: Number(priceEurGram.toFixed(2)) });
  }

  if (newEntries.length === 0) {
    console.log('ℹ️ Ei uusia päiviä lisättäväksi.');
    return;
  }

  // Varmuuskopio ennen kirjoitusta
  if (existsSync(HISTORY_PATH)) {
    copyFileSync(HISTORY_PATH, HISTORY_PATH.replace('.json', '.backup.json'));
  }

  const merged = [...history, ...newEntries]
    .sort((a, b) => a.date.localeCompare(b.date));

  writeFileSync(HISTORY_PATH, JSON.stringify(merged, null, 2));
  console.log(`✅ Lisätty ${newEntries.length} päivää (${newEntries[0].date} – ${newEntries[newEntries.length - 1].date})`);
  console.log(`📊 Historiassa nyt ${merged.length} päivää: ${merged[0].date} – ${merged[merged.length - 1].date}`);
  console.log('💾 Varmuuskopio: price-history.backup.json');
}

main().catch(err => {
  console.error('❌ Virhe:', err.message);
  process.exit(1);
});
