#!/usr/bin/env node
// social/scripts/report.mjs — Viikko- ja kuukausiraportti somea varten

import { fetchGoldPrice, calcPurityPrice } from './fetch-price.mjs';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HISTORY_PATH = join(__dirname, '..', 'data', 'price-history.json');

const TAGS = '#kulta #kullanhinta #kultalaskuri #kultakorut #romukulta #gold #goldprice #jalometalli';

function loadHistory() {
  if (!existsSync(HISTORY_PATH)) return [];
  return JSON.parse(readFileSync(HISTORY_PATH, 'utf-8'));
}

function findPrice(history, daysAgo) {
  const target = new Date();
  target.setDate(target.getDate() - daysAgo);
  const targetStr = target.toISOString().slice(0, 10);

  // Etsi tarkkaa päivää tai lähintä aikaisempaa
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].date <= targetStr) return history[i];
  }
  return null;
}

function formatChange(current, old) {
  if (!old) return 'ei dataa';
  const change = ((current - old.price) / old.price) * 100;
  const sign = change >= 0 ? '+' : '';
  const arrow = change >= 0 ? '📈' : '📉';
  return `${arrow} ${sign}${change.toFixed(1)} % (${old.price.toFixed(2)} → ${current.toFixed(2)} €/g)`;
}

async function main() {
  const { priceEurGram } = await fetchGoldPrice();
  const price14k = calcPurityPrice(priceEurGram, 0.585);
  const price18k = calcPurityPrice(priceEurGram, 0.750);
  const history = loadHistory();

  const weekAgo = findPrice(history, 7);
  const monthAgo = findPrice(history, 30);

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║         KULTALASKURI.FI — HINTARAPORTTI          ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📅 ${new Date().toLocaleDateString('fi-FI', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  console.log('');
  console.log('── Nykyhinnat ──────────────────────────────────────');
  console.log(`  24K (999): ${priceEurGram.toFixed(2)} €/g`);
  console.log(`  18K (750): ${price18k.toFixed(2)} €/g`);
  console.log(`  14K (585): ${price14k.toFixed(2)} €/g`);
  console.log('');
  console.log('── Muutokset ───────────────────────────────────────');
  console.log(`  Viikko:   ${formatChange(priceEurGram, weekAgo)}`);
  console.log(`  Kuukausi: ${formatChange(priceEurGram, monthAgo)}`);

  if (weekAgo) {
    const weekChange = ((priceEurGram - weekAgo.price) / weekAgo.price) * 100;
    const sign = weekChange >= 0 ? '+' : '';
    const direction = weekChange >= 0 ? 'nousi' : 'laski';

    console.log('');
    console.log('══════════════════════════════════════════════════');
    console.log('📋 VIIKKOPOSTAUS — kopioi someen:');
    console.log('══════════════════════════════════════════════════');
    console.log('');
    console.log(`📊 Kullan viikkokatsaus`);
    console.log('');
    console.log(`Kullan hinta ${direction} viikon aikana ${sign}${weekChange.toFixed(1)} %`);
    console.log('');
    console.log(`Viikko sitten: ${weekAgo.price.toFixed(2)} €/g`);
    console.log(`Nyt: ${priceEurGram.toFixed(2)} €/g (24K)`);
    console.log('');
    console.log(`Korukullan hinnat:`);
    console.log(`• 14K (585): ${price14k.toFixed(2)} €/g`);
    console.log(`• 18K (750): ${price18k.toFixed(2)} €/g`);
    console.log('');
    console.log(`💰 Tarkista kultakorujesi arvo: kultalaskuri.fi`);
    console.log('');
    console.log(`${TAGS} #viikkoraportti #kultatrendi`);
  }

  if (monthAgo) {
    const monthChange = ((priceEurGram - monthAgo.price) / monthAgo.price) * 100;
    const sign = monthChange >= 0 ? '+' : '';
    const direction = monthChange >= 0 ? 'nousi' : 'laski';

    console.log('');
    console.log('══════════════════════════════════════════════════');
    console.log('📋 KUUKAUSIPOSTAUS — kopioi someen:');
    console.log('══════════════════════════════════════════════════');
    console.log('');
    console.log(`📊 Kullan kuukausikatsaus`);
    console.log('');
    console.log(`Kullan hinta ${direction} kuukauden aikana ${sign}${monthChange.toFixed(1)} %`);
    console.log('');
    console.log(`Kuukausi sitten: ${monthAgo.price.toFixed(2)} €/g`);
    console.log(`Nyt: ${priceEurGram.toFixed(2)} €/g (24K)`);
    console.log('');
    console.log(`Korukullan hinnat:`);
    console.log(`• 14K (585): ${price14k.toFixed(2)} €/g`);
    console.log(`• 18K (750): ${price18k.toFixed(2)} €/g`);
    console.log('');
    console.log(`💰 Tarkista kultakorujesi arvo: kultalaskuri.fi`);
    console.log('');
    console.log(`${TAGS} #kuukausiraportti #kultatrendi #sijoittaminen`);
  }

  if (!weekAgo && !monthAgo) {
    console.log('');
    console.log('⚠️  Ei vielä tarpeeksi historiaa. Aja "npm run save" päivittäin,');
    console.log('   niin viikkoraportti on käytettävissä 7 päivän päästä.');
  }

  console.log('');
}

main().catch(err => {
  console.error('❌ Virhe:', err.message);
  process.exit(1);
});
