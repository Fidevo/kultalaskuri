// social/scripts/price-history.mjs
// Hallinnoi hintahistoriaa (JSON-tiedosto repossa)

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HISTORY_PATH = join(__dirname, '..', 'data', 'price-history.json');

export function loadHistory() {
  if (!existsSync(HISTORY_PATH)) {
    return { prices: [] };
  }
  return JSON.parse(readFileSync(HISTORY_PATH, 'utf-8'));
}

export function savePrice(priceEurGram) {
  const history = loadHistory();
  const today = new Date().toISOString().split('T')[0];

  // Älä tallenna duplikaatteja samalta päivältä
  const existing = history.prices.find(p => p.date === today);
  if (existing) {
    existing.price = priceEurGram;
    existing.updatedAt = new Date().toISOString();
  } else {
    history.prices.push({
      date: today,
      price: priceEurGram,
      createdAt: new Date().toISOString(),
    });
  }

  // Pidä vain viimeiset 90 päivää
  history.prices = history.prices.slice(-90);

  writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
  return history;
}

export function getMorningPrice() {
  const history = loadHistory();
  const today = new Date().toISOString().split('T')[0];
  return history.prices.find(p => p.date === today)?.price || null;
}

export function getWeekAgoPrice() {
  const history = loadHistory();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const target = weekAgo.toISOString().split('T')[0];

  // Etsi lähin hinta (±1 päivä)
  const candidates = history.prices.filter(p => {
    const diff = Math.abs(new Date(p.date).getTime() - weekAgo.getTime());
    return diff < 2 * 24 * 60 * 60 * 1000; // 2 päivän sisällä
  });

  return candidates.length > 0
    ? candidates.sort((a, b) => Math.abs(new Date(a.date).getTime() - weekAgo.getTime()) - Math.abs(new Date(b.date).getTime() - weekAgo.getTime()))[0].price
    : null;
}
