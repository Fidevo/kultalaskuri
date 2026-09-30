#!/usr/bin/env node
// social/scripts/backfill-silver.mjs
//
// Hakee hopean hintahistorian MetalPrice API:n timeframe-endpointilla samaan
// kahden tiedoston rakenteeseen kuin kullalla:
//   - silver-price-history-archive.json  ← päivät ENNEN price-history.json:n alkua
//   - silver-price-history.json          ← päivät siitä eteenpäin (buildin varahinta
//                                          + päivittäinen tallennus, save-price.mjs)
// Raja luetaan kullan price-history.json:n ensimmäisestä päivästä, jotta kulta- ja
// hopeatiedostot jakautuvat samoin.
//
// Käyttö:
//   node --env-file=.env social/scripts/backfill-silver.mjs 2011-06-01 2026-09-29          (kuiva-ajo)
//   node --env-file=.env social/scripts/backfill-silver.mjs 2011-06-01 2026-09-29 --yes    (hakee)
//   ... --raw <kansio>   tallentaa raakavastaukset validointia varten (valinnainen)
//
// Toiminta kuten backfill-archive.mjs: ≤365 pv / kutsu, uusimmasta vanhimpaan,
// pysähtyy ensimmäiseen virheeseen tai tyhjään jaksoon, vain arkipäivät, ei
// ylikirjoita olemassa olevia päiviä (päivittäisen tallennuksen arvot voittavat).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const ARCHIVE_PATH = join(DATA_DIR, 'silver-price-history-archive.json');
const RECENT_PATH = join(DATA_DIR, 'silver-price-history.json');
const GOLD_RECENT_PATH = join(DATA_DIR, 'price-history.json');
const TROY_OUNCE_IN_GRAMS = 31.1034768;
const MAX_DAYS_PER_CALL = 365;

// Lähdedatan tunnetut virhejaksot (arkipäivät jätetään pois, ei interpoloida).
// 2013-06-20…06-28: sama API:n jumijakso kuin kullassa (ks. backfill-archive.mjs) —
// XAG-arvot ~21,4–22,1 $/oz, todellinen taso ~18,6–20 $/oz; näkyisi keinotekoisena
// −10,7 %:n hyppynä 1.7.2013.
// 2013-04-16…04-23: vain hopea jumissa ~24,9 $/oz huhtikuun romahduksen jälkeen, kun
// kulta liikkui normaalisti (1 352 → 1 419 $); 24.4. keinotekoinen −7 %:n hyppy ja
// kulta–hopea-suhde pomppaa pysyvästi ~57 → ~61. Löytyi ajamalla "hopea seisoo,
// kulta liikkuu" -haku koko aineistolle; muut osumat olivat aitoja markkinaliikkeitä
// (ei kiinniottohyppyä perässä).
// Validointi 30.9.2026: hopean USD-vuosikeskiarvot LBMA:ta vastaan alle 0,3 %
// (2012, 2014–2024), EUR/USD EKP:tä vastaan alle 0,1 %.
const EXCLUDED_RANGES = [['2013-04-16', '2013-04-23'], ['2013-06-20', '2013-06-28']];
const isExcluded = (iso) => EXCLUDED_RANGES.some(([a, b]) => iso >= a && iso <= b);

const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const isWeekend = (iso) => [0, 6].includes(new Date(`${iso}T12:00:00Z`).getUTCDay());
const load = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : []);
// Arkisto rivi per päivä (kuten kullan arkisto); päivittäinen tiedosto save-price.mjs:n muodossa.
const serializeArchive = (rows) => '[\n' + rows.map(r => JSON.stringify(r)).join(',\n') + '\n]\n';
const serializeRecent = (rows) => JSON.stringify(rows, null, 2);

function chunks(start, end) {
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

  const split = load(GOLD_RECENT_PATH)[0]?.date ?? '9999-12-31';
  const archive = load(ARCHIVE_PATH);
  const recent = load(RECENT_PATH);
  const existing = new Set([...archive, ...recent].map(r => r.date));

  const plan = chunks(start, end);
  console.log(`📋 Aikaväli ${start} – ${end} → ${plan.length} API-kutsua (uusimmasta vanhimpaan)`);
  console.log(`   Raja: < ${split} → arkisto, ≥ ${split} → silver-price-history.json`);
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
      `https://api-eu.metalpriceapi.com/v1/timeframe?api_key=${apiKey}&start_date=${a}&end_date=${b}&base=USD&currencies=XAG,EUR`
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
      if (!(r?.XAG > 0) || !(r?.EUR > 0)) continue;
      const price = Number((((1 / r.XAG) * r.EUR) / TROY_OUNCE_IN_GRAMS).toFixed(4));
      if (!Number.isFinite(price) || price <= 0) continue;
      added.push({ date, price });
      existing.add(date);
      n++;
    }
    console.log(`✅ ${a} – ${b}: ${n} arkipäivää (kiintiö ${quota})`);
    if (n === 0) { console.log('⛔ Tyhjä jakso — API:n historia päättyy tähän. Pysähdytään.'); break; }
  }

  if (!added.length) { console.log('ℹ️ Ei lisättävää.'); return; }
  const byDate = (x, y) => x.date.localeCompare(y.date);
  const newArchive = [...archive, ...added.filter(r => r.date < split)].filter(r => !isExcluded(r.date)).sort(byDate);
  const newRecent = [...recent, ...added.filter(r => r.date >= split)].filter(r => !isExcluded(r.date)).sort(byDate);
  writeFileSync(ARCHIVE_PATH, serializeArchive(newArchive));
  writeFileSync(RECENT_PATH, serializeRecent(newRecent));
  console.log(`💾 Arkisto: ${newArchive.length} päivää (${newArchive[0]?.date} – ${newArchive.at(-1)?.date})`);
  console.log(`💾 Päivittäinen: ${newRecent.length} päivää (${newRecent[0]?.date} – ${newRecent.at(-1)?.date})`);
}

main().catch(err => {
  console.error('❌ Virhe:', err.message);
  process.exit(1);
});
