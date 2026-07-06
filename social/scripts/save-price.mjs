#!/usr/bin/env node
// social/scripts/save-price.mjs — Tallentaa päivän kullan hinnan historiaan

import { fetchGoldPrice, calcPurityPrice } from './fetch-price.mjs';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HISTORY_PATH = join(__dirname, '..', 'data', 'price-history.json');

function loadHistory() {
  if (!existsSync(HISTORY_PATH)) return [];
  return JSON.parse(readFileSync(HISTORY_PATH, 'utf-8'));
}

function saveHistory(history) {
  writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

function getHelsinkiDate() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Helsinki' });
}

async function main() {
  const today = getHelsinkiDate(); // YYYY-MM-DD Suomen ajassa

  const history = loadHistory();
  const lastEntry = history[history.length - 1];

  if (process.env.SAVE_PRICE_ONLY_MISSING === 'true' && lastEntry?.date === today) {
    console.log(`Historia on jo ajan tasalla: ${today}`);
    return;
  }

  const { priceEurGram } = await fetchGoldPrice();

  // Älä tallenna duplikaattia samalle päivälle
  if (history.length > 0 && history[history.length - 1].date === today) {
    // Päivitä päivän hinta uusimmalla
    history[history.length - 1].price = priceEurGram;
    console.log(`📝 Päivitetty: ${today} → ${priceEurGram} €/g`);
  } else {
    history.push({ date: today, price: priceEurGram });
    console.log(`✅ Tallennettu: ${today} → ${priceEurGram} €/g`);
  }

  // Säilytä max 3 vuotta (ei leikkaa backfill-skriptillä täydennettyä historiaa)
  const MAX_DAYS = 1095;
  if (history.length > MAX_DAYS) {
    history.splice(0, history.length - MAX_DAYS);
  }

  saveHistory(history);
  console.log(`📊 Historiassa ${history.length} päivää`);
}

main().catch(err => {
  console.error('❌ Virhe:', err.message);
  process.exit(1);
});
