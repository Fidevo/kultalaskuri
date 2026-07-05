# Kultalaskuri.fi

Suomenkielinen jalometallilaskuri: kävijä syöttää kultaesineen painon ja pitoisuuden ja näkee
heti realistisen euromääräisen myyntihinnan päivän pörssikurssilla.

**Tuotanto:** https://kultalaskuri.fi (GitHub Pages, custom domain `public/CNAME`)

> 🤖 Teetkö muutoksia tekoälyagentilla? Lue ensin [CLAUDE.md](CLAUDE.md) — siellä ovat
> projektin pelisäännöt ja tunnetut sudenkuopat.

## Stack

| Osa | Teknologia |
|---|---|
| Runko | Astro v5, `output: 'static'` (SSG) |
| Interaktiiviset osat | React 19 -islandit (`client:load` / `client:visible`) |
| Tyylit | **Tailwind CSS v3** (`@astrojs/tailwind`-integraatio) + custom gold-paletti |
| Fontti | Plus Jakarta Sans (Google Fonts) |
| Ikonit | lucide-react (React-komponenteissa), inline-SVG (Astro-tiedostoissa) |
| Hintadata | [MetalPrice API](https://metalpriceapi.com) (EU-palvelin `api-eu.metalpriceapi.com`) |
| Analytiikka | Umami (evästeetön) + Microsoft Clarity — vain tuotannossa |
| Hosting | GitHub Pages, deploy GitHub Actionsilla |

## Komennot

```sh
npm install        # riippuvuudet
npm run dev        # dev-palvelin (localhost:4321) — käyttää hintahistorian viimeisintä hintaa, EI kuluta API-kutsuja
npm run build      # tuotantobuild ./dist — hakee oikean hinnan API:sta (1 kutsu), fallback hintahistoriaan
npm run preview    # buildatun sivuston esikatselu
```

Ympäristömuuttujat (`.env`, ei versionhallinnassa):

```
METALPRICE_API_KEY=...       # pakollinen tuotantobuildissa
PUBLIC_SUPABASE_URL=...      # käytössä vain julkaisemattomassa _yrityksille-draftissa
PUBLIC_SUPABASE_ANON_KEY=...
```

## Sivut

| URL | Tiedosto | Sisältö |
|---|---|---|
| `/` | `src/pages/index.astro` | Päälaskuri, tavoitehinnat, painoarvio, hintagraafi, leimaopas-tiiviste, FAQ |
| `/kullan-hinta/` | `kullan-hinta.astro` | Hintakehityssivu: graafi + kuukausitaulukko + FAQ |
| `/kullan-myynti/` | `kullan-myynti.astro` | Myyntiopas + laskuri + FAQ |
| `/kullan-myynti-verotus/` | `kullan-myynti-verotus.astro` | Verotusopas (faktat Vero.fi-lähteistä — katso CLAUDE.md) |
| `/kullan-leimat/` | `kullan-leimat.astro` | Leimaopas: 585/750, nimileimat, vuosileimataulukot 1906–, ulkomaiset leimat |
| `/sanasto/` | `sanasto.astro` | 15 termin sanasto (DefinedTermSet-schema) |
| `/tietoa/` | `tietoa.astro` | Tietoa palvelusta (E-E-A-T) |
| `/widget/` | `widget.astro` | Upotettavan hintawidgetin ohjesivu |
| `/hinta.json` | `hinta.json.ts` | Avoin JSON-hintadata (widgetin datalähde, CORS `*`) |
| `/tietosuoja/`, `/kayttoehdot/` | | Legal |

Alaviivalla alkavat tiedostot (`_yrityksille.astro`, `drafts/`, `api/_partner-inquiry.ts`)
ovat luonnoksia, jotka **eivät buildaudu**.

## Arkkitehtuuri ja datavirrat

```
MetalPrice API (api-eu.metalpriceapi.com)
  │
  ├─► src/lib/api/metalPriceApi.ts ── buildin aikana: spot-hinta €/g
  │      └─ fallback: social/data/price-history.json viimeisin piste
  │
  ├─► social/scripts/save-price.mjs ── arkisin klo ~18: lisää päivän hinnan
  │      └─ social/data/price-history.json  (max 1095 pv)
  │            ├─► GoldPriceChart (graafi), kuukausitaulukko, muutos-%
  │            └─► fallback-hinta
  │
  └─► social/scripts/backfill-price-history.mjs ── manuaalinen historian täydennys
         (timeframe-endpoint: 365 pv / 1 API-kutsu)
```

Laskentalogiikka: `src/lib/calculations/goldCalculator.ts` — `GOLD_PURITIES` sisältää
pitoisuudet ja tavoitehintakertoimet. **Kaikki hintalaskenta kulkee `calculateGoldValue()`-funktion
kautta** — älä kovakoodaa kertoimia muualle.

## Automaatio (GitHub Actions)

| Workflow | Ajastus | Tehtävä |
|---|---|---|
| `deploy.yml` | Arkisin joka tunti (min 17) + push main + manuaalinen | Build + deploy GitHub Pagesiin. Jokainen build = 1 API-kutsu. |
| `social-save-price.yml` | Arkisin ~18.07 Suomen aikaa | Tallentaa päivän hinnan historiaan ja committaa. |

Viikonloppuisin ei ajoja — kultapörssi on kiinni (pe ~24 UTC – su ~22 UTC), hinta ei liiku.
Huom: GitHubin cron ei ole täsmällinen; ajoja jää ajoittain väliin ruuhkan takia.
API-kiintiö näkyy MetalPrice-hallintapaneelista tai vastausheaderista `X-API-CURRENT`.

## Upotettava widget

Muille sivustoille tarjottava hintawidget: `public/widget.js` hakee datan `/hinta.json`-endpointista.
Käyttö isäntäsivulla:

```html
<div id="kultalaskuri-widget"></div>
<script async src="https://kultalaskuri.fi/widget.js"></script>
```

## Hintahistorian täydennys

```sh
node social/scripts/backfill-price-history.mjs 2025-07-01 2025-12-31
```

Yksi kutsu kattaa enintään 365 päivää. Skripti ei ylikirjoita olemassa olevia päiviä ja
ottaa varmuuskopion (`price-history.backup.json`).
