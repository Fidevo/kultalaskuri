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

async function main() {
  const { priceEurGram } = await fetchGoldPrice();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const history = loadHistory();

  // Älä tallenna duplikaattia samalle päivälle
  if (history.length > 0 && history[history.length - 1].date === today) {
    // Päivitä päivän hinta uusimmalla
    history[history.length - 1].price = priceEurGram;
    console.log(`📝 Päivitetty: ${today} → ${priceEurGram} €/g`);
  } else {
    history.push({ date: today, price: priceEurGram });
    console.log(`✅ Tallennettu: ${today} → ${priceEurGram} €/g`);
  }

  // Säilytä max 365 päivää
  if (history.length > 365) {
    history.splice(0, history.length - 365);
  }

  saveHistory(history);
  console.log(`📊 Historiassa ${history.length} päivää`);
}

main().catch(err => {
  console.error('❌ Virhe:', err.message);
  process.exit(1);
});
