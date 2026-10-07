#!/usr/bin/env node
// social/scripts/save-price.mjs — Tallentaa päivän kullan ja hopean hinnan historiaan

import { fetchGoldPrice } from './fetch-price.mjs';
import { checkPlausible } from './price-guard.mjs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HISTORY_PATH = join(__dirname, '..', 'data', 'price-history.json');
const SILVER_HISTORY_PATH = join(__dirname, '..', 'data', 'silver-price-history.json');

function loadHistory(path) {
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function saveHistory(path, history) {
  writeFileSync(path, JSON.stringify(history, null, 2));
}

function getHelsinkiDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Helsinki' });
}

// Lisää päivän hinta tai päivitä saman päivän merkintä (ei duplikaatteja).
function upsertToday(history, today, price, label) {
  const last = history[history.length - 1];
  if (last?.date === today) {
    last.price = price;
    console.log(`📝 ${label} päivitetty: ${today} → ${price} €/g`);
  } else {
    history.push({ date: today, price });
    console.log(`✅ ${label} tallennettu: ${today} → ${price} €/g`);
  }
}

async function main() {
  const today = getHelsinkiDate(); // YYYY-MM-DD Suomen ajassa
  const onlyMissing = process.env.SAVE_PRICE_ONLY_MISSING === 'true';

  const history = loadHistory(HISTORY_PATH);
  const silverHistory = loadHistory(SILVER_HISTORY_PATH);
  const goldDone = history[history.length - 1]?.date === today;
  const silverDone = silverHistory[silverHistory.length - 1]?.date === today;

  if (onlyMissing && goldDone && silverDone) {
    console.log(`Historia on jo ajan tasalla: ${today}`);
    return;
  }

  // Yksi API-kutsu hakee molemmat metallit.
  const { priceEurGram, silverEurGram } = await fetchGoldPrice();

  // Epäuskottava hinta → ei tallenneta mitään, jottei virhe jää historiaan
  // (joka on myös buildin varahinta). Exit 1 → healthchecks-hälytys.
  const problems = [
    checkPlausible(priceEurGram, history, 'gold'),
    silverEurGram ? checkPlausible(silverEurGram, silverHistory, 'silver') : { ok: true },
  ].filter((c) => !c.ok);
  if (problems.length) {
    for (const p of problems) console.log(`::error::Hintatarkistus: ${p.reason}`);
    throw new Error('Epäuskottava hinta — historiaa ei päivitetty');
  }

  // ONLY_MISSING-tilassa jo tallennettua päivää ei ylikirjoiteta.
  if (!(onlyMissing && goldDone)) upsertToday(history, today, priceEurGram, 'Kulta');
  if (silverEurGram && !(onlyMissing && silverDone)) {
    upsertToday(silverHistory, today, silverEurGram, 'Hopea');
  } else if (!silverEurGram) {
    console.warn('⚠️ Hopean hinta puuttui API-vastauksesta — hopeahistoriaa ei päivitetty');
  }

  // Historiaa EI leikata: aiempi 1095 merkinnän raja olisi poistanut vanhinta
  // dataa (myös backfillattua) noin neljän vuoden kuluttua. Pitkä historia
  // ennen tämän tiedoston alkua on erillisessä price-history-archive.json:ssa.
  saveHistory(HISTORY_PATH, history);
  saveHistory(SILVER_HISTORY_PATH, silverHistory);
  console.log(`📊 Historiassa ${history.length} päivää (kulta), ${silverHistory.length} päivää (hopea)`);
}

main().catch(err => {
  console.error('❌ Virhe:', err.message);
  process.exit(1);
});
