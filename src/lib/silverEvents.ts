// src/lib/silverEvents.ts
// Hopean hinnan käännekohdat /hopean-hintahistoria/-sivun aikajanalle.
//
// TOIMITETTU SISÄLTÖ — sama periaate kuin goldEvents.ts:ssä (CLAUDE.md säännöt 6 ja 16):
// jokainen tapahtuma on tarkistettu avaamalla lähde (sourceUrl) 30.9.2026, ja tekstissä
// on vain lähteessä mainittuja asioita. Lähteiksi valittu vain luotettavia ja Suomesta
// avautuvia sivuja (CNN:n ja CNBC:n omat sivut eivät auenneet EU:ssa tarkistushetkellä).
// Lähteiden prosentit ja hinnat ovat dollareissa — teksti sanoo sen. Euromääräiset
// luvut lasketaan buildissa datasta (eventMetric), EI kirjoiteta tähän.
//
// Jätetty pois, koska luotettavaa hopeaa nimenomaisesti koskevaa lähdettä ei löytynyt:
// huhtikuun 2013 romahdus ja Brexit 2016.

import type { GoldEvent } from './goldEvents';

export const SILVER_EVENTS: GoldEvent[] = [
  {
    id: 'romahdus-2011',
    date: '2011-09-23',
    kind: 'shock',
    title: 'Pahin kahden päivän pudotus 31 vuoteen',
    text: 'Syyskuun 2011 lopulla jalometallimarkkinat romahtivat, kun pelättiin, etteivät euroalueen hallitukset saa velkakriisiä hallintaan ja maailmantalouden kasvu hidastuu. Hopea kirjasi maailmanmarkkinoilla pahimman kahden päivän pudotuksensa 31 vuoteen.',
    sourceName: 'Business Standard / PTI',
    sourceUrl: 'https://www.business-standard.com/article/markets/gold-suffers-biggest-1-day-fall-111092600115_1.html',
  },
  {
    id: 'pohja-2015',
    date: '2015-07-17',
    kind: 'trough',
    title: 'Alimmillaan sitten 2009',
    text: 'Perjantaina 17.7.2015 hopea painui dollareissa alimmalle tasolleen sitten vuoden 2009, kun Yhdysvaltain keskuspankki valmisteli koronnostoa. Myös kulta oli viiden vuoden pohjalla.',
    sourceName: 'Business Standard',
    sourceUrl: 'https://www.business-standard.com/article/markets/gold-slumps-to-five-year-low-silver-to-six-year-bottom-115071800142_1.html',
  },
  {
    id: 'korona-2020',
    date: '2020-03-18',
    kind: 'trough',
    title: 'Koronakriisi painoi hopean pohjalle',
    // Lähde vaihdettu 30.9.2026: aiempi Statistics Canada -luku (−12,6 %) koski Kanadan
    // tuottajahintaindeksiä (jalostamaton hopea, CAD), ei spot-hintaa — ei siirrettävissä.
    text: 'Maaliskuun 2020 markkinapaniikissa hopea painui 18.3. päivän aikana 11,64 dollariin unssilta. Samasta pohjasta alkoi nousu, joka vei hinnan elokuuhun mennessä korkeimmalle tasolle sitten 2013.',
    sourceName: 'The Silver Institute',
    sourceUrl: 'https://silverinstitute.org/silver-price-rises-us28-00-per-ounce-140-percent-2020-low/',
  },
  {
    id: 'nousu-2020',
    date: '2020-08-06',
    kind: 'peak',
    title: 'Yli 140 %:n nousu pohjalta',
    text: 'Maaliskuun pohjasta hopea nousi elokuun alkuun mennessä dollareissa yli 140 % ja kävi korkeimmalla tasollaan sitten 2013. Silver Institute mainitsi syiksi hopean aseman turvasatamana, inflaatiopelot, erittäin matalat korot ja keskuspankkien elvytyksen.',
    sourceName: 'The Silver Institute',
    sourceUrl: 'https://silverinstitute.org/silver-price-rises-us28-00-per-ounce-140-percent-2020-low/',
  },
  {
    id: 'reddit-2021',
    date: '2021-02-01',
    kind: 'shock',
    title: 'Somesijoittajat hopean kimppuun',
    text: 'GameStop-osakkeen ympärillä kohisseet Reddit-sijoittajat siirsivät huomionsa hopeaan. Hopean futuurit nousivat 1.2.2021 lähes 12 % yli 30 dollariin unssilta, korkeimmalle tasolle kahdeksaan vuoteen.',
    sourceName: 'AP / Al Jazeera',
    sourceUrl: 'https://www.aljazeera.com/economy/2021/2/1/gamestop-is-so-last-week-silver-is-the-hot-day-trader-target-now',
  },
  {
    id: 'huippu-2024',
    date: '2024-10-21',
    kind: 'peak',
    title: 'Korkeimmillaan 12 vuoteen',
    text: 'Lokakuussa 2024 hopean futuurit kävivät hetkellisesti yli 34 dollarissa unssilta, korkeimmalla tasolla 12 vuoteen. Analyytikot perustelivat vahvaa näkymää hopean monipuolisella käytöllä muun muassa elektroniikassa ja aurinkopaneeleissa.',
    sourceName: 'Yahoo Finance',
    sourceUrl: 'https://finance.yahoo.com/news/gold-extends-record-silver-jumps-to-12-year-high-as-precious-metals-outperform-stock-market-170355954.html',
  },
  {
    id: 'yli-50-2025',
    date: '2025-10-09',
    kind: 'peak',
    title: 'Yli 50 dollarin ensimmäistä kertaa sitten 1980',
    text: 'Hopean spot-hinta ylitti 9.10.2025 50 dollarin rajan ensimmäistä kertaa sitten 1980, ja muutamaa päivää myöhemmin New Yorkin futuurit tekivät uuden kaikkien aikojen ennätyksen. Taustalla olivat turvasatamakysyntä, vahva teollinen kysyntä ja pitkään jatkunut tarjontavaje.',
    sourceName: 'CNN / Yahoo Finance',
    sourceUrl: 'https://finance.yahoo.com/news/silver-just-hit-50-ounce-185211278.html',
  },
  {
    id: 'ennatys-2026',
    date: '2026-01-30',
    kind: 'shock',
    title: 'Ennätys yli 121 dollarissa — ja jyrkkä pudotus',
    text: 'Vuonna 2025 hopean keskihinta nousi dollareissa 42 %, ja alkuvuonna 2026 nousu kiihtyi. Hopea kävi 29.1.2026 kaikkien aikojen ennätyksessään, yli 121 dollarissa unssilta, ja putosi heti sen jälkeen jyrkästi.',
    sourceName: 'The Silver Institute',
    sourceUrl: 'https://silverinstitute.org/elevated-lease-rates-regional-liquidity-tightness-and-robust-investor-interest-resulted-in-record-silver-prices-in-2025/',
  },
];
