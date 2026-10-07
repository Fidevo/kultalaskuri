#!/usr/bin/env node
// ops/clarity-collect.mjs — Clarityn päivädatan arkistointi (ajetaan Hetznerillä)
//
// Clarityn Data Export API antaa vain viimeiset 1–3 vuorokautta, 10 kutsua
// projektia kohden päivässä ja enintään 1 000 riviä kutsua kohden. Historiaa
// ei siis voi hakea jälkikäteen → tämä ajetaan joka päivä ja tallentaa
// edellisen 24 h omaksi tiedostokseen. Data EI repoon (liikesalaisuus).
//
// Token: CLARITY_API_TOKEN tiedostossa /opt/kultalaskuri/.env.
// Käyttää 4/10 päivän kutsusta — loput jäävät käsin tehtäviin hakuihin.
//
//   node clarity-collect.mjs

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const ENV_PATH = process.env.KL_ENV_PATH ?? '/opt/kultalaskuri/.env';
const DATA_DIR = process.env.CLARITY_DATA_DIR ?? '/opt/kultalaskuri/data/clarity';
const ENDPOINT = 'https://www.clarity.ms/export-data/api/v1/project-live-insights';

// Jokainen kutsu palauttaa kaikki mittarit (vieritys, sitoutumisaika, rage/dead
// clickit, quickbackit…) annettujen dimensioiden mukaan pilkottuna.
const VIEWS = {
  byUrl: ['URL'],
  byUrlDevice: ['URL', 'Device'],
  byChannel: ['Channel', 'Source'],
  byCountry: ['Country/Region'],
};

function readToken() {
  const line = readFileSync(ENV_PATH, 'utf-8')
    .split('\n')
    .find((l) => l.startsWith('CLARITY_API_TOKEN='));
  // trim(): Windowsista liitetty rivi voi päättyä \r-merkkiin
  const token = line?.slice('CLARITY_API_TOKEN='.length).trim();
  if (!token) throw new Error(`CLARITY_API_TOKEN puuttuu tiedostosta ${ENV_PATH}`);
  return token;
}

async function fetchView(token, dimensions) {
  const params = new URLSearchParams({ numOfDays: '1' });
  dimensions.forEach((d, i) => params.set(`dimension${i + 1}`, d));
  const res = await fetch(`${ENDPOINT}?${params}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Clarity ${dimensions.join('+')} HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  // Tiedoston nimi = keruupäivä (Helsinki). Sisältö kattaa sitä edeltävät 24 h —
  // cron ajaa klo 23.55, jolloin ikkuna ≈ kyseinen kalenteripäivä.
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Helsinki' });
  const file = join(DATA_DIR, `${today}.json`);
  if (existsSync(file)) {
    console.log(`${today} on jo tallennettu — ei kuluteta kutsuja`);
    return;
  }

  const token = readToken();
  const data = { collectedAt: new Date().toISOString(), window: 'edelliset 24 h', views: {} };
  for (const [name, dimensions] of Object.entries(VIEWS)) {
    data.views[name] = await fetchView(token, dimensions);
  }

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(`${file}.tmp`, JSON.stringify(data));
  renameSync(`${file}.tmp`, file);

  const traffic = data.views.byUrl.find((m) => m.metricName === 'Traffic')?.information ?? [];
  // Evästeettömässä tilassa Clarityn "sessio" on käytännössä sivulataus, ei käynti.
  const sessions = traffic.reduce((sum, r) => sum + Number(r.totalSessionCount ?? 0), 0);
  console.log(`${today}: ${sessions} sivulatausta ("sessiota"), ${traffic.length} URL-riviä → ${file}`);
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
