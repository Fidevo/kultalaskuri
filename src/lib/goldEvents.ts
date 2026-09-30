// src/lib/goldEvents.ts
// Kullan hinnan käännekohdat /kullan-hintahistoria/-sivun aikajanalle.
//
// TOIMITETTU SISÄLTÖ — jokainen tapahtuma on tarkistettu lähteestä (sourceUrl)
// ja päivämäärän hintaliike omasta datasta (9/2026). 30.9.2026 KAIKKI kortit tarkistettu
// uudelleen avaamalla lähde itse: tekstissä vain lähteessä sanottu + tämän sivun
// aineistosta laskettu (merkitty "tämän sivun aineistossa"). CNN:n (451 EU:ssa) ja
// CNBC:n (403) lähteet vaihdettu Suomesta avautuviin. Älä lisää tapahtumaa ilman
// lähdettä (CLAUDE.md sääntö 6). Tekstit ovat kuvailevia, eivät ennusteita tai
// sijoitusneuvoja. Euromääräiset luvut EIVÄT ole tässä tiedostossa — ne lasketaan
// buildissa datasta (eventMetrics), jotta teksti ja data eivät voi erota.
//
// Huom: MetalPrice API:n noteeraus otetaan päivän vaihteessa, joten "shock"-tyypin
// korteissa näytetään muutos huipusta pohjaan ±3 pörssipäivän ikkunassa (ei "päivämuutosta").

import { indexOnOrBefore, type PricePoint } from './utils/longHistory';

export type EventKind = 'shock' | 'peak' | 'trough' | 'trend';

export interface GoldEvent {
  id: string;
  date: string; // tapahtumapäivä YYYY-MM-DD
  kind: EventKind;
  /** trend: muutos tapahtumapäivästä näin monen kalenteripäivän päähän */
  trendDays?: number;
  title: string;
  text: string;
  sourceName: string;
  sourceUrl: string;
  /** Lisälähde, kun kortin väitteet tulevat kahdesta lähteestä. */
  extraSources?: { name: string; url: string }[];
}

export const GOLD_EVENTS: GoldEvent[] = [
  {
    id: 'eurokriisi-2011',
    date: '2011-09-06',
    kind: 'peak',
    title: 'Eurokriisi ja silloinen ennätys',
    text: 'Kiihtyvä inflaatio, Yhdysvaltain luottoluokituksen lasku ja pahentuva euroalueen velkakriisi ajoivat sijoittajia kultaan. Kulta nousi 5.–6.9.2011 silloiseen ennätykseensä, 1 895 dollariin unssilta (Lontoon iltapäivän hinta). Euroissa tämän sivun aineiston huipputaso ylittyi jo syyskuussa 2012.',
    sourceName: 'World Gold Council',
    sourceUrl: 'https://www.gold.org/news-and-events/press-releases/global-gold-demand-6-third-quarter-2011',
  },
  {
    id: 'romahdus-2013',
    date: '2013-04-15',
    kind: 'shock',
    title: 'Kullan romahdus huhtikuussa 2013',
    text: 'Kulta laski kahdessa pörssipäivässä (12.–15.4.) jyrkimmin sitten vuoden 1983. Taustalla olivat Yhdysvaltain talouden koheneminen, osakemarkkinoiden nousu, dollarin vahvistuminen ja odotettua heikompi Kiinan kasvu.',
    sourceName: 'ABC News',
    sourceUrl: 'https://abcnews.com/blogs/business/2013/04/gold-sell-off-biggest-in-30-years',
  },
  {
    id: 'koronnosto-2015',
    date: '2015-12-16',
    kind: 'trough',
    title: 'Koronnosto-odotukset ja monivuotinen pohja',
    // Lähde on julkaistu päätöspäivän aamuna ennen päätöstä — teksti kertoo vain sen, mitä lähde tukee.
    text: 'Yhdysvaltain keskuspankin odotettiin nostavan 16.12.2015 ohjauskorkoa ensimmäistä kertaa lähes vuosikymmeneen. Koronnosto-odotukset ja dollarin vahvistuminen olivat painaneet kultaa vuoden aikana dollareissa noin 10 %, ja joulukuun alussa se kävi lähellä kuuden vuoden pohjaa.',
    sourceName: 'Business Standard / Reuters',
    sourceUrl: 'https://www.business-standard.com/article/reuters/gold-edges-up-ahead-of-fed-rate-hike-decision-115121600126_1.html',
  },
  {
    id: 'brexit-2016',
    date: '2016-06-24',
    kind: 'shock',
    title: 'Brexit-äänestys',
    text: 'Britannian äänestettyä EU-erosta kulta nousi päivän aikana dollareissa jopa 8 %, ja fyysisen kullan kysyntä kasvoi niin, että osalta jälleenmyyjiltä loppuivat kultakolikot ja kiloharkot. Euroissa kulta nousi kolmen vuoden huippuun, koska euro heikkeni samaan aikaan jyrkästi dollaria vastaan.',
    sourceName: 'Fortune',
    sourceUrl: 'https://fortune.com/2016/06/24/gold-brexit/',
  },
  {
    id: 'koronlasku-2019',
    date: '2019-06-20',
    kind: 'trend',
    trendDays: 90,
    title: 'Koronlaskuodotukset ja kuuden vuoden huippu',
    text: 'Kesäkuussa 2019 kulta nousi yli 1 400 dollarin, korkeimmalle tasolle sitten toukokuun 2013, kun markkinat odottivat Yhdysvaltain keskuspankilta koronlaskuja. Euroissa tämän sivun aineiston vuoden 2012 huipputaso ylittyi elokuussa 2019.',
    sourceName: 'Business Standard / Reuters',
    sourceUrl: 'https://www.business-standard.com/article/markets/gold-slides-over-1-as-fed-dashes-imminent-rate-cut-hopes-119062600164_1.html',
  },
  {
    id: 'korona-2020',
    date: '2020-03-23',
    kind: 'shock',
    title: 'Koronakriisi: myyntipaniikki ja elvytys',
    text: 'Maaliskuun 2020 markkinapaniikissa kultaakin myytiin, kun sijoittajat tarvitsivat käteistä riskisijoitustensa vakuusvaatimuksiin. Keskuspankkien koronlaskut sekä biljoonien dollarien elvytystoimet nostivat kullan maaliskuun notkahduksesta — Yhdysvaltain keskuspankki ilmoitti 23.3. ostavansa arvopapereita niin paljon kuin tarvitaan.',
    sourceName: 'World Gold Council',
    sourceUrl: 'https://www.gold.org/goldhub/research/gold-demand-trends/gold-demand-trends-q1-2020/investment',
    extraSources: [{ name: 'Federal Reserve 23.3.2020', url: 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20200323b.htm' }],
  },
  {
    id: 'yli-2000-2020',
    // Lähde kertoo ennätyksestä perjantaina 7.8.2020 (ei ensimmäisen 2 000 $:n ylityksen päivää).
    date: '2020-08-07',
    kind: 'peak',
    title: 'Ennätys yli 2 000 dollarissa',
    text: 'Pandemian elvytystoimet ja negatiiviset reaalikorot nostivat kullan elokuussa 2020 yli 2 000 dollarin ja ennätykseen 7.8. Tiistaina 11.8. hinta putosi päivän aikana jyrkimmin seitsemään vuoteen, kun Venäjän koronarokoteilmoitus käynnisti myynnin.',
    sourceName: 'Business Standard',
    sourceUrl: 'https://www.business-standard.com/article/markets/gold-fights-back-rebounds-above-1-900-after-biggest-loss-in-7-years-120081300058_1.html',
  },
  {
    id: 'ukraina-2022',
    date: '2022-02-24',
    kind: 'trend',
    trendDays: 14,
    title: 'Venäjä hyökkää Ukrainaan',
    text: 'Venäjän hyökkäys nosti kullan kysyntää turvasatamana. Tiistaina 8.3.2022 kulta kävi 2 069,89 dollarissa unssilta, aivan vuoden 2020 ennätyksen (2 072,50 dollaria) tuntumassa.',
    sourceName: 'Reuters / Yahoo Finance',
    sourceUrl: 'https://finance.yahoo.com/news/russia-shock-hurls-gold-toward-133818938.html',
  },
  {
    id: 'pariteetti-2022',
    date: '2022-07-12',
    kind: 'trend',
    trendDays: 90,
    title: 'Euro ja dollari samanarvoisiksi',
    // Kulta-osuus tämän sivun aineistosta (30.9.2026): 1.6.–30.9.2022 dollareissa −10,1 %,
    // euroissa −2,2 % (USD palautettu saman hintapalvelun EUR/USD-kurssilla).
    text: 'Euro heikkeni dollarin tasolle ensimmäistä kertaa 20 vuoteen. Tämän sivun aineistossa kullan dollarimääräinen hinta laski kesällä 2022 selvästi, mutta euroissa pudotus jäi paljon pienemmäksi — suomalaiselle myyjälle ratkaisee euromääräinen hinta.',
    sourceName: 'Euronews',
    sourceUrl: 'https://www.euronews.com/business/2022/07/12/euro-reaches-parity-with-dollar-for-the-first-time-in-20-years',
  },
  {
    id: 'lahi-ita-2023',
    date: '2023-10-09',
    kind: 'trend',
    trendDays: 90,
    title: 'Lähi-idän sota käänsi kullan nousuun',
    text: 'Israelin tapahtumat 7.10.2023 käynnistivät turvasatamakysynnän vauhdittaman nousun: syyskuun lopussa alle 1 850 dollarissa käynyt kulta nousi 27.10. mennessä takaisin yli 2 000 dollarin unssilta.',
    sourceName: 'World Gold Council',
    sourceUrl: 'https://www.gold.org/goldhub/research/gold-market-commentary-october-2023',
  },
  {
    id: 'tullit-2025',
    date: '2025-04-22',
    kind: 'peak',
    title: 'Tulliepävarmuus ja 3 500 dollaria',
    text: 'Presidentti Trumpin arvaamaton kauppapolitiikka ja hänen hyökkäyksensä keskuspankin pääjohtajaa Jerome Powellia vastaan nostivat kullan 22.4.2025 ensimmäistä kertaa 3 500 dollariin unssilta.',
    sourceName: 'Investopedia / Yahoo Finance',
    sourceUrl: 'https://finance.yahoo.com/news/gold-hits-3-500-trumps-105228599.html',
  },
  {
    id: 'pudotus-2025',
    date: '2025-10-21',
    kind: 'shock',
    title: 'Voitonkotiutus ennätysten jälkeen',
    // Korjattu 30.9.2026 lähteen mukaiseksi: Kitco kertoo ~5,5 %:n päivälaskusta, pahimmasta
    // neljään vuoteen (ei "~6 %, sitten 2013").
    text: 'Ennätyksestä toiseen noussut kulta putosi 21.10.2025 dollareissa päivän aikana lähes 5,5 % — jyrkimmin neljään vuoteen — kun sijoittajat kotiuttivat voittoja. Hinta oli silti yli 56 % korkeammalla kuin vuoden alussa.',
    sourceName: 'Kitco News',
    sourceUrl: 'https://www.kitco.com/news/article/2025-10-21/gold-and-silver-see-worst-one-day-drop-years-long-term-uptrend-remains',
  },
  {
    id: 'warsh-2026',
    date: '2026-01-30',
    kind: 'shock',
    title: 'Keskuspankin johtajavalinta romahdutti kullan',
    text: 'Kulta nousi maanantaina 26.1.2026 ensimmäistä kertaa yli 5 000 dollarin unssilta. Kun presidentti Trump nimesi perjantaina 30.1. Kevin Warshin keskuspankin johtoon, dollari vahvistui ja kulta putosi 11,4 % 4 745,10 dollarin päätöshintaan.',
    sourceName: 'Fortune',
    sourceUrl: 'https://fortune.com/2026/01/31/what-happened-gold-silver-dollar-markets-kevin-warsh-fed-reaction/',
  },
];

export interface EventMetric {
  /** Kuvaajan kohdistuspäivä (datassa oleva pörssipäivä) */
  anchorDate: string;
  price: number; // €/g kohdistuspäivänä
  label: string; // esim. "Muutos 12.–15.4.2013", "Huippu 16.10.2025" — havaintojen omat päivät
  value: string; // valmiiksi muotoiltu, esim. "▼ 8,1 %" tai "43,66 €/g"
  dir: 'up' | 'down' | 'flat';
}

const pctStr = (pct: number) =>
  `${pct > 0 ? '▲ ' : pct < 0 ? '▼ ' : ''}${Math.abs(pct).toFixed(1).replace('.', ',')} %`;
const eurStr = (n: number) => `${n.toFixed(2).replace('.', ',')} €/g`;
// Mittarin tunnisteeseen havainnon OMA päivä: kortin otsikkopäivä on tapahtumapäivä,
// mutta huippu/pohja/muutos voi osua muutaman havainnon päähän siitä.
const dStr = (iso: string, withYear = true) => {
  const [y, m, d] = iso.split('-').map(Number);
  return withYear ? `${d}.${m}.${y}` : `${d}.${m}.`;
};

/** Laskee tapahtumakortin luvut datasta (build-aikana). */
export function eventMetric(rows: PricePoint[], e: GoldEvent): EventMetric | null {
  if (!rows.length || e.date < rows[0].date || e.date > rows.at(-1)!.date) return null;
  const i = indexOnOrBefore(rows, e.date);
  const clamp = (k: number) => Math.max(0, Math.min(rows.length - 1, k));

  if (e.kind === 'shock') {
    // EI väitetä yhden päivän muutosta: API:n noteeraus otetaan päivän vaihteessa
    // (~00 UTC), joten perjantain liike kirjautuu lauantaille (pudotettu) ja näkyy
    // maanantaina yhdessä maanantain liikkeen kanssa. Siksi näytetään muutos
    // huipusta pohjaan (tai pohjasta huippuun) ±3 pörssipäivän ikkunassa ja kerrotaan
    // montako pörssipäivää väli kattaa.
    let sign = 0, bestAbs = 0;
    for (let k = clamp(i - 2); k <= clamp(i + 3); k++) {
      if (k === 0) continue;
      const pct = ((rows[k].price - rows[k - 1].price) / rows[k - 1].price) * 100;
      if (Math.abs(pct) > bestAbs) { bestAbs = Math.abs(pct); sign = Math.sign(pct); }
    }
    const before = { k: clamp(i - 3) }, after = { k: i };
    for (let k = clamp(i - 3); k <= i; k++) {
      if (sign < 0 ? rows[k].price > rows[before.k].price : rows[k].price < rows[before.k].price) before.k = k;
    }
    for (let k = i; k <= clamp(i + 3); k++) {
      if (sign < 0 ? rows[k].price < rows[after.k].price : rows[k].price > rows[after.k].price) after.k = k;
    }
    const pct = ((rows[after.k].price - rows[before.k].price) / rows[before.k].price) * 100;
    const a = rows[before.k].date, b = rows[after.k].date;
    return {
      anchorDate: rows[after.k].date,
      price: rows[after.k].price,
      label: `Muutos ${dStr(a, a.slice(0, 4) !== b.slice(0, 4))}–${dStr(b)}`,
      value: pctStr(pct),
      dir: pct > 0 ? 'up' : 'down',
    };
  }
  if (e.kind === 'peak' || e.kind === 'trough') {
    let k0 = i;
    for (let k = clamp(i - 5); k <= clamp(i + 5); k++) {
      if (e.kind === 'peak' ? rows[k].price > rows[k0].price : rows[k].price < rows[k0].price) k0 = k;
    }
    return { anchorDate: rows[k0].date, price: rows[k0].price, label: `${e.kind === 'peak' ? 'Huippu' : 'Pohja'} ${dStr(rows[k0].date)}`, value: eurStr(rows[k0].price), dir: e.kind === 'peak' ? 'up' : 'down' };
  }
  // trend
  const days = e.trendDays ?? 30;
  const endIso = new Date(new Date(`${rows[i].date}T12:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);
  if (endIso > rows.at(-1)!.date) return null;
  const j = indexOnOrBefore(rows, endIso);
  const pct = ((rows[j].price - rows[i].price) / rows[i].price) * 100;
  return { anchorDate: rows[i].date, price: rows[i].price, label: `Muutos ${dStr(rows[i].date, rows[i].date.slice(0, 4) !== rows[j].date.slice(0, 4))}–${dStr(rows[j].date)}`, value: pctStr(pct), dir: Math.abs(pct) < 0.05 ? 'flat' : pct > 0 ? 'up' : 'down' };
}
