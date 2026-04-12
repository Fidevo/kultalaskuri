#!/usr/bin/env node
// social/scripts/educational-post.mjs — Opettava postaus (manuaalinen julkaisu)
// Generoi kuvan ja captionin paikallisesti → julkaise itse someen

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { generateEducationalImage } from './generate-image.mjs';
import { educationalCaption } from './captions.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSTS_PATH = join(__dirname, '..', 'data', 'educational-posts.json');
const STATE_PATH = join(__dirname, '..', 'data', 'educational-state.json');

function loadState() {
  if (!existsSync(STATE_PATH)) return { usedIndexes: [] };
  return JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

async function main() {
  console.log('💡 Opettava postaus — kuvan ja tekstin generointi\n');

  const posts = JSON.parse(readFileSync(POSTS_PATH, 'utf-8'));
  const state = loadState();

  // Etsi käyttämätön postaus
  let available = posts
    .map((p, i) => ({ ...p, index: i }))
    .filter(p => !state.usedIndexes.includes(p.index));

  // Jos kaikki käytetty, aloita alusta
  if (available.length === 0) {
    console.log('🔄 Kaikki postaukset käytetty, aloitetaan alusta');
    state.usedIndexes = [];
    available = posts.map((p, i) => ({ ...p, index: i }));
  }

  // Valitse satunnainen
  const post = available[Math.floor(Math.random() * available.length)];
  console.log(`📌 Valittu: "${post.title}" (${state.usedIndexes.length + 1}/${posts.length})`);

  // Merkitse käytetyksi
  state.usedIndexes.push(post.index);
  saveState(state);

  // Generoi kuva
  const imagePath = join(__dirname, '..', 'output', 'educational.png');
  generateEducationalImage(post.title, post.bullets, imagePath);

  // Generoi caption
  const caption = educationalCaption(post.caption, post.tags);

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
