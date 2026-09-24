#!/usr/bin/env node
// social/scripts/backfill-archive.mjs
//
// Hakee pitkän hintahistorian ARKISTOON (social/data/price-history-archive.json)
// MetalPrice API:n timeframe-endpointilla. price-history.json:iin (buildin
// varahinta, päivittäinen tallennus) EI kosketa.
//
// Käyttö:
//   node --env-file=.env social/scripts/backfill-archive.mjs 2006-01-01 2025-12-31          (kuiva-ajo: näyttää kutsut)
//   node --env-file=.env social/scripts/backfill-archive.mjs 2006-01-01 2025-12-31 --yes    (hakee)
//   ... --raw <kansio>   tallentaa raakavastaukset validointia varten (valinnainen)
//
// Toiminta:
//  - Jakaa välin ≤365 päivän jaksoihin (1 API-kutsu / jakso) ja hakee UUSIMMASTA
//    VANHIMPAAN — jos API:n historia loppuu, saatu data on silti yhtenäinen.
//  - Pysähtyy ensimmäiseen virheeseen tai tyhjään vastaukseen.
//  - Tallentaa vain arkipäivät (sama käytäntö kuin price-history.json) ja jättää
//    pois tunnetut lähdedatan virhejaksot (EXCLUDED_RANGES).
//  - Ei ylikirjoita arkistossa jo olevia päiviä; ei tallenna päiviä, jotka ovat
//    price-history.json:n alussa tai sen jälkeen (tiedostot eivät mene päällekkäin).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const ARCHIVE_PATH = join(DATA_DIR, 'price-history-archive.json');
const HISTORY_PATH = join(DATA_DIR, 'price-history.json');
const TROY_OUNCE_IN_GRAMS = 31.1034768;
const MAX_DAYS_PER_CALL = 365;

// Lähdedatan tunnetut virhejaksot (arkipäivät jätetään pois, ei interpoloida).
// 2013-06-20…06-28: API:n XAU-arvot jumissa FEDin 19.6.2013 kokousta edeltävällä
// tasolla (~1 340–1 368 $/oz, todellinen ~1 210–1 290 $/oz); "korjaantuu" vasta
// 29.6. → näkyisi virheellisenä −7 %:n hyppynä 1.7.2013. Havaittu validoinnissa 9/2026.
const EXCLUDED_RANGES = [['2013-06-20', '2013-06-28']];
const isExcluded = (iso) => EXCLUDED_RANGES.some(([a, b]) => iso >= a && iso <= b);

const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const isWeekend = (iso) => [0, 6].includes(new Date(`${iso}T12:00:00Z`).getUTCDay());

// Yksi rivi per päivä — luettava diff ja pienempi tiedosto kuin 2 välilyönnin sisennyksellä
const serialize = (rows) => '[\n' + rows.map(r => JSON.stringify(r)).join(',\n') + '\n]\n';

function chunks(start, end) {
  // Uusimmasta vanhimpaan
  const out = [];
  let chunkEnd = end;
  while (chunkEnd >= start) {
    const candidate = addDays(chunkEnd, -(MAX_DAYS_PER_CALL - 1));
    const chunkStart = candidate < start ? start : candidate;
    out.push([chunkStart, chunkEnd]);
    chunkEnd = addDays(chunkStart, -1);
  }
  return out;
}

async function main() {
  const [start, end] = process.argv.slice(2, 4);
  const confirmed = process.argv.includes('--yes');
  const rawIdx = process.argv.indexOf('--raw');
  const rawDir = rawIdx > -1 ? process.argv[rawIdx + 1] : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(end ?? '') || start > end) {
    throw new Error('Anna aikaväli: YYYY-MM-DD YYYY-MM-DD');
  }

  const history = existsSync(HISTORY_PATH) ? JSON.parse(readFileSync(HISTORY_PATH, 'utf-8')) : [];
  const historyStart = history[0]?.date ?? '9999-12-31';
  const archive = existsSync(ARCHIVE_PATH) ? JSON.parse(readFileSync(ARCHIVE_PATH, 'utf-8')) : [];
  const existing = new Set(archive.map(r => r.date));

  const effectiveEnd = end < historyStart ? end : addDays(historyStart, -1);
  const plan = chunks(start, effectiveEnd);
  console.log(`📋 Aikaväli ${start} – ${effectiveEnd} → ${plan.length} API-kutsua (uusimmasta vanhimpaan)`);
  plan.forEach(([a, b], i) => console.log(`   ${String(i + 1).padStart(2)}. ${a} – ${b}`));
  if (!confirmed) {
    console.log('ℹ️ Kuiva-ajo. Lisää --yes hakeaksesi.');
    return;
  }

  const apiKey = process.env.METALPRICE_API_KEY;
  if (!apiKey) throw new Error('METALPRICE_API_KEY puuttuu');
  if (rawDir) mkdirSync(rawDir, { recursive: true });

  const added = [];
  for (const [a, b] of plan) {
    const res = await fetch(
      `https://api-eu.metalpriceapi.com/v1/timeframe?api_key=${apiKey}&start_date=${a}&end_date=${b}&base=USD&currencies=XAU,EUR`
    );
    const quota = `${res.headers.get('x-api-current')}/${res.headers.get('x-api-quota')}`;
    const data = await res.json().catch(() => null);
    if (rawDir) writeFileSync(join(rawDir, `${a}_${b}.json`), JSON.stringify(data));
    if (!res.ok || !data?.success || !data.rates) {
      console.log(`⛔ ${a} – ${b}: HTTP ${res.status}, ei dataa (${JSON.stringify(data?.error ?? data).slice(0, 160)}). Pysähdytään.`);
      break;
    }
    let n = 0;
    for (const [date, r] of Object.entries(data.rates)) {
      if (date < a || date > b || isWeekend(date) || isExcluded(date) || existing.has(date)) continue;
      if (!(r?.XAU > 0) || !(r?.EUR > 0)) continue;
      const price = Number((((1 / r.XAU) * r.EUR) / TROY_OUNCE_IN_GRAMS).toFixed(2));
      if (!Number.isFinite(price) || price <= 0) continue;
      added.push({ date, price });
      existing.add(date);
      n++;
    }
    console.log(`✅ ${a} – ${b}: ${n} arkipäivää (kiintiö ${quota})`);
    if (n === 0) { console.log('⛔ Tyhjä jakso — API:n historia päättyy tähän. Pysähdytään.'); break; }
  }

  if (!added.length) { console.log('ℹ️ Ei lisättävää.'); return; }
  const merged = [...archive, ...added]
    .filter(r => !isExcluded(r.date))
    .sort((x, y) => x.date.localeCompare(y.date));
  writeFileSync(ARCHIVE_PATH, serialize(merged));
  console.log(`💾 Arkistossa nyt ${merged.length} päivää: ${merged[0].date} – ${merged.at(-1).date}`);
}

main().catch(err => {
  console.error('❌ Virhe:', err.message);
  process.exit(1);
});
