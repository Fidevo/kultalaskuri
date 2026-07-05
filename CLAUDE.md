# Ohjeet tekoälyagenteille — Kultalaskuri.fi

Tämä tiedosto on tarkoitettu kielimalliagenteille (Claude Code, Copilot, Cursor ym.),
jotka tekevät muutoksia tähän projektiin. Lue tämä kokonaan ennen ensimmäistäkään muutosta.
Yleiskuvaus ja komennot: [README.md](README.md).

## Mikä tämä on

Suomenkielinen, staattisesti generoitu (Astro SSG) kultalaskurisivusto. Kävijä syöttää
kultaesineen painon ja pitoisuuden → näkee realistisen myyntihinnan. Sivusto on
**riippumaton hinta-arviopalvelu**: se ei osta kultaa. Noin 80 % kävijöistä käyttää
sivustoa **puhelimella** — mobile-first on pakollinen lähtökohta kaikessa.

## Kovat säännöt (älä riko näitä)

1. **Kaikki sisältö suomeksi.** Hinnat desimaalipilkulla (`115,83 €`), ei pisteellä.
   Näkyvät luvut: `.toFixed(2).replace('.', ',')` tai `Intl.NumberFormat('fi-FI')`.
2. **Hintalaskenta vain `calculateGoldValue()`-funktion kautta**
   (`src/lib/calculations/goldCalculator.ts`). Älä kovakoodaa pitoisuus- tai
   tavoitehintakertoimia mihinkään muualle. Älä muuta `GOLD_PURITIES`-kertoimia
   ilman omistajan nimenomaista lupaa.
3. **Älä käytä sanaa "reaaliaikainen".** Hinta päivittyy buildeissa (arkisin tunneittain).
   Oikeat ilmaisut: "päivittyvä", "päivän kurssilla", "päivitetty {pvm} klo {aika}".
4. **Ei prosenttihaarukoita ostohinnoista** (esim. "70–85 % pörssiarvosta") näkyvissä
   teksteissä. Viestintä keskittyy tavoitehintaan: "taso, jota kannattaa vähintään
   tavoitella". Poikkeus: laskurin "Näin arvio lasketaan" -erittely saa näyttää
   tarkan kertoimen (läpinäkyvyys).
5. **Kultakolikoita ei esitetä romukultana/sulatuskohteena** — kolikoista maksetaan
   keräilypreemio. 24K-esimerkeissä puhutaan kultaharkoista.
6. **Ei vahvistamattomia faktaväitteitä** (esim. maksutavat, "maksavat käteisellä").
   Kirjoita neutraalisti ("varmista ostajalta etukäteen") ellei lähdettä ole.
7. **Verotussivu (`kullan-myynti-verotus.astro`) on lakitekstiä.** Muutokset vain
   Verohallinnon (vero.fi) lähteisiin nojaten. Päivitä sivun "tarkistettu viimeksi"
   -päivämäärä aina kun muokkaat sitä. Älä koskaan pehmennä disclaimeria.
8. **Vuosileimataulukot ovat algoritmisia** (`kullan-leimat.astro`): 24 kirjainta
   (ei J, W, Å, Ä, Ö), kierros = 24 v, sarja alkoi 1810. Varmistetut ankkurit:
   A8=1978, Z8=2001, A9=2002, K9=2011, Z9=2025, A10=2026. Älä muuta ilman lähdettä
   (Tukes / leimat.fi).
9. **Ei kaupunkikohtaisia landing-sivuja eikä affiliate-linkkejä.** Älä myöskään
   kirjoita sisältöön lupauksia tyyliin "meillä ei ole koskaan kumppaneita" —
   sivustolle voi tulevaisuudessa tulla luotettavia ostajakumppaneita.
10. **`social/data/price-history.json` on dataa, ei koodia.** Älä muokkaa käsin.
    Täydennys: `social/scripts/backfill-price-history.mjs` (kysy lupa — kuluttaa
    API-kiintiötä). Tiedosto on myös buildin fallback-hinta, joten se ei saa rikkoutua.
11. **Jos muutat `package.json`-riippuvuuksia, aja `npm install`** jotta
    `package-lock.json` pysyy synkassa — muuten CI:n `npm ci` kaatuu.
12. **Älä lisää uusia npm-riippuvuuksia ilman painavaa syytä** (bundle-koko).
    Graafi on custom-SVG juuri siksi, ettei chart-kirjastoa haluttu.

## Tekniset sudenkuopat

- **Tailwind on v3, EI v4** — vaikka projektin historiassa on ollut v4-viittauksia.
  Käytössä `@astrojs/tailwind` + `tailwind.config.mjs`. Seuraukset:
  - Opasiteettimuokkaimet vain 5:n askelin (`/5`, `/10`…) tai hakasulkein (`/[0.04]`).
    `bg-white/4` EI generoi mitään CSS:ää — hiljainen virhe.
  - `gold`-paletti on custom (50–700 + glow) `tailwind.config.mjs`:ssä. Jos käytät
    uutta sävyä (esim. `gold-800`), lisää se configiin — muuten luokka ei tuota mitään.
- **SSG + hydraatio:** älä kutsu `new Date()`:a tai selain-API:ja React-komponentin
  renderissä — käytä `useState(() => ...)`-initializeria tai `useEffect`iä
  (hydration mismatch React 19:ssä).
- **Islandien välinen kommunikointi:** `window.dispatchEvent(new CustomEvent('kl:use-weight',
  { detail: { weight, purity } }))` — GoldCalculator kuuntelee tätä. Ei suoria ref-viittauksia
  islandien yli.
- **Laskurin tila:** URL-parametrit `?paino=4&karaatti=14K` (jaettavat linkit) ja
  localStorage-avain `kl-viimeisin` (paluukäynti). Säilytä yhteensopivuus jos muutat.
- **Painokenttä on `type="text"` + `inputMode="decimal"` tarkoituksella** — `type="number"`
  hylkää suomalaisen desimaalipilkun. Älä "korjaa" takaisin.
- **JSON-LD-schema:** URL:t loppukauttaviivalla (`/kullan-myynti/`), sama kuin canonical.
  Sivuilla, joissa FAQ-data jaetaan schemalle ja UI:lle samasta objektista, schema-teksteihin
  EI saa laittaa HTML:ää.
- **og:image vaatii absoluuttisen URL:n** — BaseLayout hoitaa tämän (`ogImageAbs`),
  välitä `ogImage`-propina polku tai asset-`src`.
- **Print-tyylit:** laskurin tuloste toimii luokilla `no-print` (piilossa tulosteessa)
  ja `print-only` (näkyy vain tulosteessa) — ks. `global.css`. Testaa tulostenäkymä
  jos muutat laskurin rakennetta.
- **Umami-seuranta:** käytä olemassa olevaa `track()`-helperiä (try/catch-kääritty,
  ei kaadu jos Umami puuttuu). Analytiikka latautuu vain tuotannossa (`isProd`).
- **Dev-moodi ei kuluta API-kutsuja** (hinta hintahistoriasta); tuotantobuild kuluttaa
  yhden kutsun. API: EU-palvelin `api-eu.metalpriceapi.com`.
- **Alaviivalla alkavat sivut** (`_yrityksille.astro`, `drafts/`) eivät buildaudu —
  älä poista alaviivaa "siivouksena".

## Design-konventiot

- **Tunnistettavuus säilytettävä:** tumma hero (`#0B0F19`) + kulta-aksentti (#D4AF37) +
  valkoinen sisältöalue. Ei radikaaleja ulkoasumuutoksia ilman lupaa.
- **Hero-kaava kaikilla sivuilla:** keskitetty, murupolku ylhäällä, badge/kicker,
  H1 `text-3xl md:text-5xl font-black` + gradient-span
  (`from-gold-200 to-gold-600`), ingressi `text-sm md:text-base text-gray-400 max-w-2xl mx-auto`.
- **Osiot vuorottelevat** valkoinen/harmaa (`bg-white` / `bg-gray-50`), osion yllä
  pieni uppercase-kicker. Kortit `rounded-2xl border`.
- **Ei emojeja UI:ssa** — käytä lucide-tyylisiä inline-SVG-ikoneita (stroke 2,
  24×24 viewBox). Poikkeus: 🇫🇮-lippu heron luottamusrivillä.
- **Taulukot mobiilissa:** jos taulukko ei mahdu 375 px leveyteen, tee siitä
  korttilista mobiiliin (`md:hidden`) ja pidä taulukko desktopissa (`hidden md:block`)
  samasta data-arraysta — ks. `foreignMarks` kullan-leimat-sivulla.
- **Saavutettavuus:** valintanapeille `aria-pressed`, nappiryhmille fieldset/legend,
  ei `focus:outline-none` ilman korvaavaa focus-tyyliä, murupolut `nav[aria-label]`.

## Muutosten varmistus

1. `npx astro build` on mentävä läpi (10 sivua).
2. Testaa mobiilinäkymä (375 px): ei vaakasuuntaista vieritystä.
3. Jos muutit laskuria: testaa pilkkusyöte ("4,5"), esimerkkinappi ja jaettava
   linkki (`/?paino=8&karaatti=18K`).
4. Tarkista ettei konsolissa ole virheitä eikä hydration-varoituksia.
