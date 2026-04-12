#!/usr/bin/env node
// social/scripts/weekly-post.mjs — Viikkoraportti (manuaalinen julkaisu)
// Generoi kuvan ja captionin paikallisesti → julkaise itse someen

import { fetchGoldPrice } from './fetch-price.mjs';
import { generateWeeklyImage } from './generate-image.mjs';
import { savePrice, getWeekAgoPrice } from './price-history.mjs';
import { weeklyCaption } from './captions.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('📊 Viikkoraportti — kuvan ja tekstin generointi\n');

  const { priceEurGram } = await fetchGoldPrice();
  console.log(`24K nyt: ${priceEurGram} €/g`);

  savePrice(priceEurGram);

  const weekAgoPrice = getWeekAgoPrice();
  if (!weekAgoPrice) {
    console.log('⚠️  Viikon takaista hintaa ei löydy historiasta. Ohitetaan.');
    return;
  }

  console.log(`24K viikko sitten: ${weekAgoPrice} €/g`);
  const change = ((priceEurGram - weekAgoPrice) / weekAgoPrice) * 100;
  console.log(`Muutos: ${change >= 0 ? '+' : ''}${change.toFixed(1)} %`);

  // Generoi kuva
  const imagePath = join(__dirname, '..', 'output', 'weekly.png');
  generateWeeklyImage(priceEurGram, weekAgoPrice, imagePath);

  // Generoi caption
  const caption = weeklyCaption(priceEurGram, weekAgoPrice);

  console.log('\n' + '='.repeat(60));
  console.log('🖼️  KUVA TALLENNETTU:');
  console.log(`   ${imagePath}`);
  console.log('\n📝 CAPTION (kopioi tämä someen):');
  console.log('='.repeat(60));
  console.log(caption);
  console.log('='.repeat(60));
  console.log('\n✅ Valmis! Julkaise kuva ja teksti manuaalisesti Facebookiin ja Instagramiin.');
}

main().catch(err => {
  console.error('❌ Virhe:', err.message);
  process.exit(1);
});
