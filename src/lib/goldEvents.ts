// src/lib/goldEvents.ts
// Kullan hinnan käännekohdat /kullan-hintahistoria/-sivun aikajanalle.
//
// TOIMITETTU SISÄLTÖ — jokainen tapahtuma on tarkistettu lähteestä (sourceUrl)
// ja päivämäärän hintaliike omasta datasta (9/2026). Älä lisää tapahtumaa ilman
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
}

export const GOLD_EVENTS: GoldEvent[] = [
  {
    id: 'eurokriisi-2011',
    date: '2011-09-06',
    kind: 'peak',
    title: 'Eurokriisi ja silloinen ennätys',
    text: 'Euroalueen velkakriisi ja Yhdysvaltain luottoluokituksen lasku elokuussa 2011 ajoivat sijoittajia kultaan. Kulta nousi syyskuun alussa silloiseen ennätykseensä, noin 1 900 dollariin unssilta. Euroissa tämä huippu ylittyi vasta elokuussa 2019.',
    sourceName: 'CNN Money',
    sourceUrl: 'https://money.cnn.com/2011/11/17/markets/gold_europe_demand/index.htm',
  },
  {
    id: 'romahdus-2013',
    date: '2013-04-15',
    kind: 'shock',
    title: 'Kullan romahdus huhtikuussa 2013',
    text: 'Kulta laski kahdessa päivässä (12.–15.4.) jyrkimmin sitten 1980-luvun. Taustalla olivat talouden koheneminen, osakemarkkinoiden nousu ja odotukset Yhdysvaltain keskuspankin elvytyksen hidastamisesta.',
    sourceName: 'ABC News',
    sourceUrl: 'https://abcnews.com/blogs/business/2013/04/gold-sell-off-biggest-in-30-years',
  },
  {
    id: 'koronnosto-2015',
    date: '2015-12-16',
    kind: 'trough',
    title: 'Koronnosto ja monivuotinen pohja',
    text: 'Yhdysvaltain keskuspankki nosti ohjauskorkoa ensimmäistä kertaa lähes vuosikymmeneen. Kulta oli juuri painunut monivuotiseen pohjaansa — ja kääntyi sen jälkeen nousuun.',
    sourceName: 'Business Standard / Reuters',
    sourceUrl: 'https://www.business-standard.com/article/reuters/gold-edges-up-ahead-of-fed-rate-hike-decision-115121600126_1.html',
  },
  {
    id: 'brexit-2016',
    date: '2016-06-24',
    kind: 'shock',
    title: 'Brexit-äänestys',
    text: 'Britannian äänestettyä EU-erosta kulta nousi päivässä jyrkästi turvasatamakysynnän vuoksi. Euroissa nousu oli dollarihintaa suurempi, koska euro heikkeni samaan aikaan.',
    sourceName: 'Fortune',
    sourceUrl: 'https://fortune.com/2016/06/24/gold-brexit/',
  },
  {
    id: 'koronlasku-2019',
    date: '2019-06-20',
    kind: 'trend',
    trendDays: 90,
    title: 'Koronlaskuodotukset käänsivät kullan nousuun',
    text: 'Yhdysvaltain keskuspankki antoi kesäkuussa 2019 ymmärtää laskevansa korkoja. Kulta nousi yli 1 400 dollarin ensimmäistä kertaa sitten 2013, ja euroissa vuoden 2012 ennätys ylittyi elokuussa 2019.',
    sourceName: 'Business Standard / Reuters',
    sourceUrl: 'https://www.business-standard.com/amp/article/markets/gold-slides-over-1-as-fed-dashes-imminent-rate-cut-hopes-119062600164_1.html',
  },
  {
    id: 'korona-2020',
    date: '2020-03-23',
    kind: 'shock',
    title: 'Koronakriisi: myyntipaniikki ja elvytys',
    text: 'Maaliskuun 2020 markkinapaniikissa myös kultaa myytiin, kun sijoittajat tarvitsivat käteistä. Kun Yhdysvaltain keskuspankki ilmoitti 23.3. rajattomista arvopaperiostoista, kulta kääntyi jyrkkään nousuun.',
    sourceName: 'CNBC',
    sourceUrl: 'https://www.cnbc.com/2020/03/23/gold-markets-coronavirus-stimulus-measures-in-focus.html',
  },
  {
    id: 'yli-2000-2020',
    date: '2020-08-06',
    kind: 'peak',
    title: 'Ensimmäistä kertaa yli 2 000 dollarin',
    text: 'Pandemian elvytystoimet ja matalat korot nostivat kullan elokuussa 2020 ensimmäistä kertaa yli 2 000 dollarin unssilta. Muutamaa päivää myöhemmin (11.8.) hinta putosi jyrkimmin seitsemään vuoteen, kun Venäjä ilmoitti koronarokotteesta.',
    sourceName: 'Business Standard',
    sourceUrl: 'https://www.business-standard.com/article/markets/gold-fights-back-rebounds-above-1-900-after-biggest-loss-in-7-years-120081300058_1.html',
  },
  {
    id: 'ukraina-2022',
    date: '2022-02-24',
    kind: 'trend',
    trendDays: 14,
    title: 'Venäjä hyökkää Ukrainaan',
    text: 'Hyökkäyspäivänä kulta nousi yli 3 %, ja maaliskuun alussa se kävi lähellä silloista ennätystään.',
    sourceName: 'CNBC',
    sourceUrl: 'https://www.cnbc.com/2022/02/24/russia-invades-ukraine-gold-jumps-to-highest-in-more-than-a-year.html',
  },
  {
    id: 'pariteetti-2022',
    date: '2022-07-12',
    kind: 'trend',
    trendDays: 90,
    title: 'Euro ja dollari samanarvoisiksi',
    text: 'Euro heikkeni dollarin tasolle ensimmäistä kertaa 20 vuoteen. Dollarimääräinen kullan hinta laski kesällä 2022, mutta euroissa pudotus jäi selvästi pienemmäksi — suomalaiselle myyjälle ratkaisee euromääräinen hinta.',
    sourceName: 'Euronews',
    sourceUrl: 'https://www.euronews.com/business/2022/07/12/euro-reaches-parity-with-dollar-for-the-first-time-in-20-years',
  },
  {
    id: 'lahi-ita-2023',
    date: '2023-10-09',
    kind: 'trend',
    trendDays: 90,
    title: 'Lähi-idän sota ja nousun alku',
    text: 'Hamasin hyökkäys Israeliin 7.10.2023 käänsi kullan nousuun seitsemän kuukauden pohjalta. Tästä alkoi nousu, joka vei hinnan vuosina 2024–2025 ennätyksestä toiseen.',
    sourceName: 'CNBC',
    sourceUrl: 'https://www.cnbc.com/2023/10/09/safe-haven-gold-soars-as-investors-run-from-middle-east-clashes.html',
  },
  {
    id: 'tullit-2025',
    date: '2025-04-22',
    kind: 'peak',
    title: 'Tulliepävarmuus ja 3 500 dollaria',
    text: 'Yhdysvaltain laajat tullit ja presidentti Trumpin painostus keskuspankkia kohtaan nostivat kullan 22.4.2025 ensimmäistä kertaa yli 3 500 dollarin unssilta.',
    sourceName: 'CNN',
    sourceUrl: 'https://www.cnn.com/2025/04/22/business/gold-price-surge-trump-powell-attacks-stocks-hnk-intl/index.html',
  },
  {
    id: 'pudotus-2025',
    date: '2025-10-21',
    kind: 'shock',
    title: 'Yli 4 000 dollaria — ja jyrkin pudotus sitten 2013',
    text: 'Kulta ylitti lokakuussa 2025 ensimmäistä kertaa 4 000 dollaria unssilta. Ennätyksen jälkeen 21.10. hinta putosi dollareissa noin 6 % — jyrkimmin sitten huhtikuun 2013 — kun sijoittajat kotiuttivat voittoja.',
    sourceName: 'Kitco News',
    sourceUrl: 'https://www.kitco.com/news/article/2025-10-21/gold-and-silver-see-worst-one-day-drop-years-long-term-uptrend-remains',
  },
  {
    id: 'warsh-2026',
    date: '2026-01-30',
    kind: 'shock',
    title: 'Keskuspankin johtajavalinta romahdutti kullan',
    text: 'Kulta nousi tammikuussa 2026 ensimmäistä kertaa yli 5 000 dollarin unssilta. Kun presidentti Trump nimesi Kevin Warshin keskuspankin johtoon 30.1., dollari vahvistui ja kulta putosi dollareissa päivässä noin 9 %.',
    sourceName: 'CNBC',
    sourceUrl: 'https://www.cnbc.com/2026/01/30/silver-gold-fall-price-usd-dollar-fed-warsh-chair-trump-metals.html',
  },
];

export interface EventMetric {
  /** Kuvaajan kohdistuspäivä (datassa oleva pörssipäivä) */
  anchorDate: string;
  price: number; // €/g kohdistuspäivänä
  label: string; // esim. "Muutos 2 pörssipäivässä", "Huippu", "Muutos 90 pv"
  value: string; // valmiiksi muotoiltu, esim. "▼ 8,1 %" tai "43,66 €/g"
  dir: 'up' | 'down' | 'flat';
}

const pctStr = (pct: number) =>
  `${pct > 0 ? '▲ ' : pct < 0 ? '▼ ' : ''}${Math.abs(pct).toFixed(1).replace('.', ',')} %`;
const eurStr = (n: number) => `${n.toFixed(2).replace('.', ',')} €/g`;

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
    const n = Math.max(1, after.k - before.k);
    const pct = ((rows[after.k].price - rows[before.k].price) / rows[before.k].price) * 100;
    return {
      anchorDate: rows[after.k].date,
      price: rows[after.k].price,
      label: `Muutos ${n} pörssipäivässä`,
      value: pctStr(pct),
      dir: pct > 0 ? 'up' : 'down',
    };
  }
  if (e.kind === 'peak' || e.kind === 'trough') {
    let k0 = i;
    for (let k = clamp(i - 5); k <= clamp(i + 5); k++) {
      if (e.kind === 'peak' ? rows[k].price > rows[k0].price : rows[k].price < rows[k0].price) k0 = k;
    }
    return { anchorDate: rows[k0].date, price: rows[k0].price, label: e.kind === 'peak' ? 'Huippu' : 'Pohja', value: eurStr(rows[k0].price), dir: e.kind === 'peak' ? 'up' : 'down' };
  }
  // trend
  const days = e.trendDays ?? 30;
  const endIso = new Date(new Date(`${rows[i].date}T12:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);
  if (endIso > rows.at(-1)!.date) return null;
  const j = indexOnOrBefore(rows, endIso);
  const pct = ((rows[j].price - rows[i].price) / rows[i].price) * 100;
  return { anchorDate: rows[i].date, price: rows[i].price, label: `Muutos ${days} pv`, value: pctStr(pct), dir: Math.abs(pct) < 0.05 ? 'flat' : pct > 0 ? 'up' : 'down' };
}
