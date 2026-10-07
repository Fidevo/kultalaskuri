#!/usr/bin/env node
// ops/gsc-collect.mjs — Search Consolen päivädatan arkistointi (ajetaan Hetznerillä)
//
// GSC säilyttää dataa vain ~16 kk. Tämä tallentaa jokaisen valmiin päivän omaksi
// JSON-tiedostokseen palvelimelle, jolloin historia säilyy pysyvästi ja
// viikkoagentti voi vertailla pitkiä jaksoja. Data on analytiikkaa
// (liikesalaisuus) → EI repoon, vain palvelimelle.
//
// Asennus palvelimella: /opt/kultalaskuri/gsc-collect.mjs, avain
// /opt/kultalaskuri/gsc-key.json (palvelutili, lukuoikeus "Rajoitettu").
// Ensimmäinen ajo hakee koko saatavilla olevan historian, sen jälkeen vain
// puuttuvat päivät. Ei npm-riippuvuuksia (Node ≥ 18).
//
//   node gsc-collect.mjs              # hae puuttuvat päivät
//   node gsc-collect.mjs --list-sites # näytä mihin ominaisuuksiin tilillä on pääsy

import { createSign } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const KEY_PATH = process.env.GSC_KEY_PATH ?? '/opt/kultalaskuri/gsc-key.json';
const DATA_DIR = process.env.GSC_DATA_DIR ?? '/opt/kultalaskuri/data/gsc';
const INSPECT_DIR = process.env.GSC_INSPECT_DIR ?? '/opt/kultalaskuri/data/gsc-inspect';
const SITEMAP_URL = 'https://kultalaskuri.fi/sitemap-0.xml';
const SITE_HINT = 'kultalaskuri.fi';

// Tiedostomuodon versio. Vanhemmat päivät haetaan uudelleen, jos näkymiä on
// lisätty — onnistuu vain GSC:n ~16 kk ikkunan sisällä, joten uudet näkymät
// kannattaa lisätä heti kun niitä tarvitaan.
const FORMAT_VERSION = 2;

// GSC:n data valmistuu ("final") 2–3 päivän viiveellä; 4 päivää on varma.
const LAG_DAYS = 4;
// GSC tarjoaa ~16 kk historiaa; ylimääräiset päivät palauttavat vain tyhjää.
const MAX_HISTORY_DAYS = 490;
const ROW_LIMIT = 25000;

const b64url = (v) => Buffer.from(v).toString('base64url');

async function getAccessToken() {
  const key = JSON.parse(readFileSync(KEY_PATH, 'utf-8'));
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error(`Token HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

async function api(token, path, body, base = 'https://www.googleapis.com/webmasters/v3') {
  const res = await fetch(`${base}/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`GSC ${path} HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function findSite(token) {
  const { siteEntry = [] } = await api(token, 'sites');
  const site = siteEntry.find((s) => s.siteUrl.includes(SITE_HINT));
  if (!site) {
    throw new Error(`Ei pääsyä ${SITE_HINT}-ominaisuuteen — lisää palvelutili Search Consolen käyttäjäksi`);
  }
  return site.siteUrl;
}

// Kaikki rivit sivutettuna (startRow), jos raja täyttyy.
async function queryAll(token, siteUrl, date, dimensions, type = 'web') {
  const rows = [];
  for (let startRow = 0; ; startRow += ROW_LIMIT) {
    const data = await api(token, `sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      startDate: date,
      endDate: date,
      dimensions,
      type,
      rowLimit: ROW_LIMIT,
      startRow,
      dataState: 'final',
    });
    const page = data.rows ?? [];
    rows.push(...page.map(({ keys, ...m }) => ({
      ...Object.fromEntries(dimensions.map((d, i) => [d, keys[i]])),
      ...m,
    })));
    if (page.length < ROW_LIMIT) return rows;
  }
}

const isoDay = (offsetDays) => new Date(Date.now() - offsetDays * 86_400_000).toISOString().slice(0, 10);

function isCurrent(file) {
  if (!existsSync(file)) return false;
  try {
    return JSON.parse(readFileSync(file, 'utf-8')).v >= FORMAT_VERSION;
  } catch {
    return false;
  }
}

// Atominen kirjoitus: keskeytynyt ajo ei jätä puolikasta tiedostoa.
function writeJson(file, data) {
  writeFileSync(`${file}.tmp`, JSON.stringify(data));
  renameSync(`${file}.tmp`, file);
}

// Indeksointitila sivustokartan sivuille (URL Inspection API, kiintiö 2000/pv —
// sivustolla ~15 sivua). Kertoo, onko sivu indeksissä, milloin Google haki sen
// viimeksi ja hyväksyikö se canonicalin. Tätä ei saa takautuvasti, joten
// tallennus kerran päivässä.
async function inspectPages(token, siteUrl) {
  const today = isoDay(0);
  const file = join(INSPECT_DIR, `${today}.json`);
  if (existsSync(file)) return;
  mkdirSync(INSPECT_DIR, { recursive: true });

  const sitemap = await (await fetch(SITEMAP_URL)).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  const pages = [];
  for (const url of urls) {
    const { inspectionResult: r = {} } = await api(
      token, 'urlInspection/index:inspect',
      { inspectionUrl: url, siteUrl, languageCode: 'fi' },
      'https://searchconsole.googleapis.com/v1',
    );
    const idx = r.indexStatusResult ?? {};
    pages.push({
      url,
      verdict: idx.verdict,
      coverageState: idx.coverageState,
      lastCrawlTime: idx.lastCrawlTime,
      pageFetchState: idx.pageFetchState,
      googleCanonical: idx.googleCanonical,
      userCanonical: idx.userCanonical,
      richResults: r.richResultsResult
        ? {
            verdict: r.richResultsResult.verdict,
            types: (r.richResultsResult.detectedItems ?? []).map((i) => i.richResultType),
          }
        : null,
    });
  }
  writeJson(file, { date: today, siteUrl, pages });
  const indexed = pages.filter((p) => p.verdict === 'PASS').length;
  console.log(`Indeksointitila ${today}: ${indexed}/${pages.length} sivua indeksissä`);
}

async function main() {
  const token = await getAccessToken();

  if (process.argv.includes('--list-sites')) {
    const { siteEntry = [] } = await api(token, 'sites');
    for (const s of siteEntry) console.log(`${s.siteUrl}  (${s.permissionLevel})`);
    return;
  }

  const siteUrl = await findSite(token);
  mkdirSync(DATA_DIR, { recursive: true });

  let saved = 0;
  for (let offset = MAX_HISTORY_DAYS; offset >= LAG_DAYS; offset--) {
    const date = isoDay(offset);
    const file = join(DATA_DIR, `${date}.json`);
    if (isCurrent(file)) continue;

    // Verkkohaku: kokonaisluvut laitteittain, maat, hakutulosten ulkoasu
    // (rikastetut tulokset), sivut laitteittain ja hakusanat sivu- ja
    // laitekohtaisesti. Anonymisoidut haut puuttuvat query-näkymästä, joten
    // sivu- ja kokonaisluvut ovat täydellisempiä kuin hakusanarivien summa.
    // Lisäksi kuvahaku ja Discover (Discover ei tue query-dimensiota).
    const data = {
      v: FORMAT_VERSION,
      date,
      siteUrl,
      totals: await queryAll(token, siteUrl, date, ['device']),
      countries: await queryAll(token, siteUrl, date, ['country']),
      appearance: await queryAll(token, siteUrl, date, ['searchAppearance']),
      pages: await queryAll(token, siteUrl, date, ['page', 'device']),
      queries: await queryAll(token, siteUrl, date, ['query', 'page', 'device']),
      image: await queryAll(token, siteUrl, date, ['query', 'page'], 'image'),
      discover: await queryAll(token, siteUrl, date, ['page'], 'discover'),
    };
    writeJson(file, data);
    saved++;
    const clicks = data.totals.reduce((sum, r) => sum + r.clicks, 0);
    console.log(`${date}: ${clicks} klikkiä, ${data.queries.length} hakusanariviä, `
      + `${data.image.length} kuvahakuriviä, ${data.appearance.length} ulkoasuriviä`);
  }
  console.log(`Valmis: ${saved} päivää päivitetty → ${DATA_DIR}`);

  await inspectPages(token, siteUrl);
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
