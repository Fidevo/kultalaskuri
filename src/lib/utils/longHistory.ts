// src/lib/utils/longHistory.ts
// Pitkä hintahistoria (/kullan-hintahistoria/) — build-aikainen datakerros.
// Yhdistää arkiston (2011-06 → 2025) ja päivittäisen historian (2026 →),
// laskee vuosi- ja kuukausitilastot sekä harventaa pitkät aikavälit viikkotasolle,
// jotta sivun HTML pysyy kevyenä.

import archive from '../../../social/data/price-history-archive.json';
import recent from '../../../social/data/price-history.json';

export interface PricePoint {
  date: string; // YYYY-MM-DD
  price: number; // €/g, puhdas kulta (spot)
}

const isWeekend = (iso: string) => [0, 6].includes(new Date(`${iso}T12:00:00Z`).getUTCDay());

/** Koko historia arkipäivinä, vanhimmasta uusimpaan. Viikonloput pudotetaan
 *  (API:n viikonloppuarvot voivat poiketa, pörssi on kiinni). */
export function loadLongHistory(): PricePoint[] {
  const map = new Map<string, number>();
  for (const r of [...(archive as PricePoint[]), ...(recent as PricePoint[])]) {
    if (!r?.date || !(r.price > 0) || isWeekend(r.date)) continue;
    map.set(r.date, r.price); // tuoreempi tiedosto voittaa päällekkäisyyksissä
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, price]) => ({ date, price }));
}

/** Viikon viimeinen havainto (ISO-viikko) — pitkien aikavälien kuvaajaan. */
export function weekly(rows: PricePoint[]): PricePoint[] {
  const out: PricePoint[] = [];
  const weekKey = (iso: string) => {
    const d = new Date(`${iso}T12:00:00Z`);
    const day = (d.getUTCDay() + 6) % 7; // ma = 0
    d.setUTCDate(d.getUTCDate() - day);
    return d.toISOString().slice(0, 10);
  };
  for (let i = 0; i < rows.length; i++) {
    const next = rows[i + 1];
    if (!next || weekKey(next.date) !== weekKey(rows[i].date)) out.push(rows[i]);
  }
  return out;
}

export interface YearStat {
  year: number;
  avg: number;
  min: PricePoint;
  max: PricePoint;
  first: PricePoint;
  last: PricePoint;
  /** Muutos edellisen vuoden viimeisestä havainnosta (ensimmäisellä vuodella: vuoden ensimmäisestä) */
  changePct: number;
  partialStart: boolean; // aineisto alkaa kesken vuoden
  ongoing: boolean; // kuluva vuosi
}

export function yearStats(rows: PricePoint[], currentYear: number): YearStat[] {
  const byYear = new Map<number, PricePoint[]>();
  for (const r of rows) {
    const y = Number(r.date.slice(0, 4));
    (byYear.get(y) ?? byYear.set(y, []).get(y)!).push(r);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  return years.map((year, i) => {
    const v = byYear.get(year)!;
    const prevLast = i > 0 ? byYear.get(years[i - 1])!.at(-1)! : null;
    const base = prevLast ?? v[0];
    const last = v.at(-1)!;
    return {
      year,
      avg: v.reduce((s, r) => s + r.price, 0) / v.length,
      min: v.reduce((m, r) => (r.price < m.price ? r : m)),
      max: v.reduce((m, r) => (r.price > m.price ? r : m)),
      first: v[0],
      last,
      changePct: ((last.price - base.price) / base.price) * 100,
      partialStart: i === 0 && v[0].date.slice(5) > '01-15',
      ongoing: year === currentYear,
    };
  });
}

export interface MonthCell {
  month: number; // 1–12
  pct: number | null; // kuukauden päätöksen muutos edellisen kuukauden päätöksestä
  ongoing: boolean;
}

/** Kuukausimuutokset lämpökarttaan: vuosi → 12 solua. */
export function monthlyReturns(rows: PricePoint[], currentMonthKey: string): { year: number; cells: MonthCell[] }[] {
  const monthLast = new Map<string, number>();
  for (const r of rows) monthLast.set(r.date.slice(0, 7), r.price);
  const keys = [...monthLast.keys()].sort();
  const pctByKey = new Map<string, number>();
  for (let i = 1; i < keys.length; i++) {
    const prev = monthLast.get(keys[i - 1])!;
    pctByKey.set(keys[i], ((monthLast.get(keys[i])! - prev) / prev) * 100);
  }
  const years = [...new Set(keys.map(k => Number(k.slice(0, 4))))].sort((a, b) => b - a);
  return years.map(year => ({
    year,
    cells: Array.from({ length: 12 }, (_, m) => {
      const key = `${year}-${String(m + 1).padStart(2, '0')}`;
      return { month: m + 1, pct: pctByKey.get(key) ?? null, ongoing: key === currentMonthKey };
    }),
  }));
}

/** Lähin havainto annettuna päivänä tai sitä ennen. */
export function indexOnOrBefore(rows: PricePoint[], iso: string): number {
  let lo = 0, hi = rows.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (rows[mid].date <= iso) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}
